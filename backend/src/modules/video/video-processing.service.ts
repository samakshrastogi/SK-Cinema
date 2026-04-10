import fs from "fs"
import os from "os"
import path from "path"
import { prisma } from "../../config/prisma"
import { s3 } from "../../config/s3"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { generateThumbnail } from "../../utils/thumbnail"
import { videoAIQueue } from "../../queues/video-ai.queue"
import { videoMetadataQueue } from "../../services/video-processing.service"
import { pipeline } from "stream/promises"

export const processVideoAfterUpload = async (
    videoId: number,
    s3Key: string,
    channelUsername: string
) => {

    const tempVideoPath = path.join(os.tmpdir(), `${videoId}_video.mp4`)
    const tempThumbnailPath = path.join(os.tmpdir(), `${videoId}_thumb.jpg`)

    try {

        const object = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: s3Key
            })
        )

        await pipeline(object.Body as any, fs.createWriteStream(tempVideoPath))

        await generateThumbnail(tempVideoPath, tempThumbnailPath)

        const thumbnailKey = `${channelUsername}/thumbnails/${Date.now()}.jpg`

        const buffer = fs.readFileSync(tempThumbnailPath)

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: thumbnailKey,
                Body: buffer,
                ContentType: "image/jpeg"
            })
        )

        await prisma.video.update({
            where: { id: videoId },
            data: { thumbnailKey }
        })

        await prisma.videoAI.upsert({
            where: { videoId },
            update: {
                status: "pending"
            },
            create: {
                videoId,
                status: "pending",
                keywords: [],
                tags: []
            }
        })

        await videoAIQueue.add(
            "processVideoAI",
            { videoId },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )

        await videoMetadataQueue.add(
            "extractVideoMetadata",
            { videoId },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )

    } catch (error) {

        await prisma.videoAI.upsert({
            where: { videoId },
            update: {
                status: "failed"
            },
            create: {
                videoId,
                status: "failed",
                keywords: [],
                tags: []
            }
        })

        throw error

    } finally {

        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)
        if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath)

    }

}