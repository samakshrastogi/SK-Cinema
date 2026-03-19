import { Worker } from "bullmq"
import { prisma } from "../config/prisma"
import { processThumbnailPipeline } from "../services/thumbnail.service"
import { redisConnection } from "../config/redis"

const worker = new Worker(
    "thumbnailQueue",
    async (job) => {

        const { videoId } = job.data

        const video = await prisma.video.findUnique({
            where: { id: videoId }
        })

        if (!video) {
            throw new Error("Video not found")
        }

        // ✅ FIX: correct function usage
        const result = await processThumbnailPipeline(videoId)

        await prisma.video.update({
            where: { id: videoId },
            data: {
                thumbnailKey: result
            }
        })

        await job.updateProgress(100)

        return { thumbnail: result }

    },
    {
        // ✅ FIX: correct Redis config
        connection: redisConnection as any,
        concurrency: 5
    }
)

/* ---------------- EVENTS ---------------- */

worker.on("completed", (job) => {
    console.log("Thumbnail generated:", job.id)
})

worker.on("failed", (job, err) => {
    console.error("Thumbnail job failed:", job?.id, err)
})

export default worker