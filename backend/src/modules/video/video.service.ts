import {
    PutObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getCFSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/prisma";
import { s3 } from "../../config/s3";
import fs from "fs";
import path from "path";
import os from "os";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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
    if (!user.channel)
        throw new Error("Please create a channel first");

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
    });

    if (!user || !user.channel) {
        throw new Error("Channel not found");
    }

    const existing = await prisma.video.findUnique({
        where: { s3Key: key },
    });

    if (existing) return existing;

    const tempDir = os.tmpdir();
    const tempVideoPath = path.join(tempDir, `${Date.now()}_video.mp4`);
    const tempThumbnailPath = path.join(tempDir, `${Date.now()}_thumb.jpg`);

    /* ---------------------------
       1️⃣ Download video from S3
    ---------------------------- */

    const getCommand = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET!,
        Key: key,
    });

    const response = await s3.send(getCommand);
    const stream = response.Body as any;

    await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempVideoPath);
        stream.pipe(writeStream);
        stream.on("error", reject);
        writeStream.on("finish", resolve);
    });

    /* ---------------------------
       2️⃣ Generate thumbnail
    ---------------------------- */

    await generateThumbnail(tempVideoPath, tempThumbnailPath);

    /* ---------------------------
       3️⃣ Upload thumbnail to S3
    ---------------------------- */

    const thumbnailKey = `${user.channel.username}/thumbnails/${Date.now()}.jpg`;

    const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: "image/jpeg",
        })
    );

    /* ---------------------------
       4️⃣ Cleanup temp files
    ---------------------------- */

    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempThumbnailPath);

    /* ---------------------------
       5️⃣ Save video record
    ---------------------------- */

    return prisma.video.create({
        data: {
            title,
            s3Key: key,
            thumbnailKey,
            size: BigInt(size),
            uploadSource: "MANUAL",
            status: "UPLOADED",
            channelId: user.channel.id,
        },
    });
};

/* ===============================
   🔥 NEW: Scan S3 Videos
================================ */

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

    // 🔥 Paginated S3 scanning (scalable)
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

    // 🔥 Faster DB comparison using Set
    const dbVideos = await prisma.video.findMany({
        where: { channelId: user.channel.id },
        select: { s3Key: true },
    });

    const dbKeySet = new Set(dbVideos.map((v) => v.s3Key));

    const remainingVideos = s3Keys.filter(
        (key) => !dbKeySet.has(key)
    );

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
        },
    });

    if (!video) {
        throw new Error("Video not found");
    }

    return {
        ...video,
        size: video.size.toString(),
        signedUrl: signCloudFrontUrl(video.s3Key),
        thumbnailUrl: video.thumbnailKey
            ? signCloudFrontUrl(video.thumbnailKey)
            : null,
    };
};