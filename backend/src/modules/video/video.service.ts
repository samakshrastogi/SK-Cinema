import {
    PutObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getCFSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/prisma";
import { s3 } from "../../config/s3";
import { videoAIQueue } from "../../queues/video-ai.queue";
import fs from "fs";
import path from "path";
import os from "os";
import { generateThumbnail } from "../../utils/thumbnail";

const signCloudFrontUrl = (key: string) => {
    const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

    return getCFSignedUrl({
        url,
        keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
        privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        dateLessThan: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
};

export const generatePresignedUrl = async (
    userId: number,
    fileName: string,
    fileType: string
) => {
    if (!process.env.AWS_BUCKET) {
        throw new Error("AWS_BUCKET is not configured");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true },
    });

    if (!user) throw new Error("User not found");
    if (!user.channel) throw new Error("Please create a channel first");

    const safeFileName = fileName.replace(/\s+/g, "_");

    const key = `${user.channel.username}/videos/${Date.now()}_${safeFileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 5,
    });

    return { uploadUrl, key };
};

export const completeUpload = async (
    userId: number,
    key: string,
    title: string,
    size: number
) => {

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true },
    })

    if (!user || !user.channel) {
        throw new Error("Channel not found")
    }

    const existing = await prisma.video.findUnique({
        where: { s3Key: key },
    })

    if (existing) return existing

    const tempDir = os.tmpdir()

    const tempVideoPath = path.join(tempDir, `${Date.now()}_video.mp4`)
    const tempThumbnailPath = path.join(tempDir, `${Date.now()}_thumb.jpg`)

    try {

        /* ---------------- DOWNLOAD VIDEO ---------------- */

        const getCommand = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: key,
        })

        const response = await s3.send(getCommand)
        const stream = response.Body as any

        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(tempVideoPath)
            stream.pipe(writeStream)
            stream.on("error", reject)
            writeStream.on("finish", resolve)
        })

        /* ---------------- GENERATE THUMBNAIL ---------------- */

        await generateThumbnail(tempVideoPath, tempThumbnailPath)

        const thumbnailKey =
            `${user.channel.username}/thumbnails/${Date.now()}.jpg`

        const thumbnailBuffer = fs.readFileSync(tempThumbnailPath)

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: "image/jpeg",
            })
        )

        /* ---------------- SAVE VIDEO ---------------- */

        const video = await prisma.video.create({
            data: {
                title,
                s3Key: key,
                thumbnailKey,
                size: BigInt(size),
                uploadSource: "MANUAL",
                status: "UPLOADED",
                channelId: user.channel.id,
            },
        })

        /* ---------------- CREATE AI RECORD ---------------- */

        await prisma.videoAI.create({
            data: {
                videoId: video.id,
                status: "pending"
            },
        })

        /* ---------------- QUEUE AI JOB ---------------- */

        await videoAIQueue.add(
            "processVideoAI",
            { videoId: video.id },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            }
        )

        console.log("AI job queued for video:", video.id)

        return video

    } catch (error) {

        console.error("Upload processing failed:", error)

        throw error

    } finally {

        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)

        if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath)

    }
}

export const scanS3Videos = async (userId: number) => {
    if (!process.env.AWS_BUCKET) {
        throw new Error("AWS_BUCKET not configured");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true },
    });

    if (!user) throw new Error("User not found");
    if (!user.channel) throw new Error("Channel not found");

    const prefix = `${user.channel.username}/videos/`;

    let continuationToken: string | undefined = undefined;
    let totalInS3 = 0;
    const s3Keys: string[] = [];

    do {
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
        });

        const response = await s3.send(command);

        const objects =
            response.Contents?.filter(
                (obj) => obj.Key && !obj.Key.endsWith("/")
            ) || [];

        objects.forEach((obj) => {
            totalInS3++;
            s3Keys.push(obj.Key!);
        });

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    const dbVideos = await prisma.video.findMany({
        where: { channelId: user.channel.id },
        select: { s3Key: true },
    });

    const dbKeySet = new Set(dbVideos.map((v) => v.s3Key));

    const remainingVideos = s3Keys.filter((key) => !dbKeySet.has(key));

    return {
        totalInS3,
        alreadyImported: dbVideos.length,
        remaining: remainingVideos.length,
        remainingVideos,
    };
};

export const getAllVideos = async () => {
    const videos = await prisma.video.findMany({
        where: { status: "UPLOADED" },
        include: {
            channel: {
                select: {
                    name: true,
                    username: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return videos.map((video) => ({
        ...video,
        size: video.size.toString(),
        signedUrl: signCloudFrontUrl(video.s3Key),
        thumbnailUrl: video.thumbnailKey
            ? signCloudFrontUrl(video.thumbnailKey)
            : null,
    }));
};

export const getVideoById = async (id: number) => {

    const video = await prisma.video.findUnique({
        where: { id },
        include: {
            channel: {
                select: {
                    name: true,
                    username: true,
                },
            },
            aiData: true
        },
    });

    if (!video) {
        throw new Error("Video not found");
    }

    return {
        ...video,
        videoAI: video.aiData, // map to frontend expected field
        size: video.size.toString(),
        signedUrl: signCloudFrontUrl(video.s3Key),
        thumbnailUrl: video.thumbnailKey
            ? signCloudFrontUrl(video.thumbnailKey)
            : null,
    };
};