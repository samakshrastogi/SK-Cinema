import {
    PutObjectCommand,
    ListObjectsV2Command
} from "@aws-sdk/client-s3"
import { nanoid } from "nanoid"
import { getSignedUrl as getCFSignedUrl } from "@aws-sdk/cloudfront-signer"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { prisma } from "../../config/prisma"
import { s3 } from "../../config/s3"

import { processVideoAfterUpload } from "./video-processing.service"

const AWS_BUCKET = process.env.AWS_BUCKET as string

if (!AWS_BUCKET) {
    throw new Error("AWS_BUCKET not configured")
}

const signCloudFrontUrl = (key: string) => {
    const encodedKey = encodeURI(key)

    const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${encodedKey}`

    return getCFSignedUrl({
        url,
        keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
        privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        dateLessThan: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    })
}

export const generatePresignedUrl = async (
    userId: number,
    fileName: string,
    fileType: string
) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true }
    })

    if (!user) throw new Error("User not found")
    if (!user.channel) throw new Error("Please create a channel first")

    const safeFileName = fileName
        .replace(/\s+/g, "_")
        .replace(/[^\w.\-]/g, "")

    const key = `${user.channel.username}/videos/${Date.now()}_${safeFileName}`

    const command = new PutObjectCommand({
        Bucket: AWS_BUCKET,
        Key: key,
        ContentType: fileType,
        CacheControl: "public, max-age=31536000"
    })

    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 5
    })

    return { uploadUrl, key }
}

export const completeUpload = async (
    userId: number,
    key: string,
    title: string,
    size: number,
    visibility?: "PUBLIC" | "PRIVATE" // ✅ NEW
) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true }
    })

    if (!user?.channel) {
        throw new Error("Channel not found")
    }

    const existing = await prisma.video.findUnique({
        where: { s3Key: key }
    })

    if (existing) return existing

    const video = await prisma.video.create({
        data: {
            publicId: nanoid(10), // ✅ ADD THIS

            title: title.trim(),
            s3Key: key,
            size: BigInt(size),
            uploadSource: "MANUAL",
            status: "UPLOADED",
            channelId: user.channel.id,
            visibility: visibility || "PUBLIC"
        }
    })

    await processVideoAfterUpload(
        video.id,
        key,
        user.channel.username
    )

    return video
}

export const scanS3Videos = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { channel: true }
    })

    if (!user?.channel) {
        throw new Error("Channel not found")
    }

    const prefix = `${user.channel.username}/videos/`

    let continuationToken: string | undefined
    const s3Keys: string[] = []

    do {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: 1000
        })

        const response = await s3.send(command)

        const objects =
            response.Contents?.filter(
                (obj) => obj.Key && !obj.Key.endsWith("/")
            ) || []

        objects.forEach((obj) => {
            if (obj.Key) {
                s3Keys.push(obj.Key)
            }
        })

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    const dbVideos = await prisma.video.findMany({
        where: { channelId: user.channel.id },
        select: { s3Key: true }
    })

    const dbKeySet = new Set(dbVideos.map((v) => v.s3Key))

    const remainingVideos = s3Keys.filter(
        (key) => !dbKeySet.has(key)
    )

    return {
        totalInS3: s3Keys.length,
        alreadyImported: dbVideos.length,
        remaining: remainingVideos.length,
        remainingVideos
    }
}

export const getAllVideos = async () => {
    const videos = await prisma.video.findMany({
        where: {
            status: "UPLOADED",
            visibility: "PUBLIC" // ✅ IMPORTANT
        },
        include: {
            channel: {
                select: {
                    name: true,
                    username: true
                }
            },
            aiData: true
        },
        orderBy: {
            createdAt: "desc"
        }
    })

    return videos.map((video) => ({
        publicId: video.publicId, // ✅ IMPORTANT
        title: video.title,
        aiTitle: video.aiData?.aiTitle ?? null,
        aiDescription: video.aiData?.aiDescription ?? null,
        channel: video.channel,
        createdAt: video.createdAt,
        thumbnailKey: video.thumbnailKey,
        signedUrl: signCloudFrontUrl(video.s3Key),
        size: video.size
    }))
}

export const getVideoById = async (publicId: string, userId?: number) => {

    const video = await prisma.video.findFirst({
        where: {
            publicId, // ✅ CHANGED
            status: "UPLOADED"
        },
        include: {
            channel: {
                select: {
                    name: true,
                    username: true,
                    userId: true
                }
            },
            aiData: true
        }
    })

    if (!video) {
        throw new Error("Video not found")
    }

    if (
        video.visibility === "PRIVATE" &&
        video.channel.userId !== userId
    ) {
        throw new Error("This video is private")
    }

    return {
        id: video.id, // keep internal id if needed
        publicId: video.publicId, // ✅ ADD THIS
        title: video.title,
        aiTitle: video.aiData?.aiTitle ?? null,
        aiDescription: video.aiData?.aiDescription ?? null,
        channel: video.channel,
        createdAt: video.createdAt,
        thumbnailKey: video.thumbnailKey,
        signedUrl: signCloudFrontUrl(video.s3Key),
        size: video.size.toString(),
        visibility: video.visibility
    }
}