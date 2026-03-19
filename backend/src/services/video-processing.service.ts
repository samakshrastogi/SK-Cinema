import { Queue } from "bullmq"
import { prisma } from "../config/prisma"

/* ---------------- QUEUES ---------------- */

export const thumbnailQueue = new Queue(
    "thumbnailQueue",
    {
        connection: {
            url: process.env.REDIS_URL!
        }
    }
)

export const videoAIQueue = new Queue(
    "videoAIQueue",
    {
        connection: {
            url: process.env.REDIS_URL!
        }
    }
)

/* ---------------- START PROCESSING ---------------- */

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