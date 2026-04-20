// @ts-nocheck
import { Queue } from "bullmq"
import { prisma } from "../config/prisma"
import { redisConnection } from "../config/redis"

/* ---------------- QUEUES ---------------- */

export const thumbnailQueue = new Queue(
    "thumbnailQueue",
    {
        connection: redisConnection as any,
        skipVersionCheck: true
    }
)
export const videoAIQueue = new Queue(
    "videoAIQueue",
    {
        connection: redisConnection as any,
        skipVersionCheck: true
    }
)
export const videoMetadataQueue = new Queue(
    "videoMetadataQueue",
    {
        connection: redisConnection as any,
        skipVersionCheck: true
    }
)

/* ---------------- START PROCESSING ---------------- */

export const startVideoProcessing = async (videoId: string) => {

    const video = await prisma.video.findUnique({
        where: { id: videoId }
    })

    if (!video) {
        throw new Error("Video not found")
    }

    await prisma.videoAI.upsert({
        where: { videoId },
        update: { status: "pending" },
        create: {
            videoId,
            status: "pending"
        }
    })

    await thumbnailQueue.add(
        "generateThumbnail",
        { videoId },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 }
        }
    )

    await videoAIQueue.add(
        "processVideoAI",
        { videoId },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 }
        }
    )

    // ✅ NEW: Metadata extraction
    await videoMetadataQueue.add(
        "extractVideoMetadata",
        { videoId },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 }
        }
    )
}
