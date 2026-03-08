import { Queue } from "bullmq"
import { redisConnection } from "../config/redis"
import { prisma } from "../config/prisma"

export const thumbnailQueue = new Queue(
    "thumbnailQueue",
    { connection: redisConnection as any }
)

export const videoAIQueue = new Queue(
    "videoAIQueue",
    { connection: redisConnection as any }
)

export const startVideoProcessing = async (videoId: number) => {

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

}