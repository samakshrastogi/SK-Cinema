import { Worker } from "bullmq"
import { prisma } from "../config/prisma"
import { processThumbnailPipeline } from "../services/thumbnail.service"
import { redisConnection } from "../config/redis"
import { emitProcessingEvent } from "../services/realtime.service"

const worker = new Worker(
    "thumbnailQueue",
    async (job) => {

        const { videoId } = job.data
        console.log(`Thumbnail worker started for videoId=${videoId}`)
        emitProcessingEvent("thumbnail-progress", { videoId, progress: 5 })
        await job.updateProgress(5)

        const video = await prisma.video.findUnique({
            where: { id: videoId }
        })
        console.log(`Fetched video record for videoId=${videoId}:`, video ? "found" : "not found")

        if (!video) {
            console.error(`Video not found for videoId=${videoId}`)
            throw new Error("Video not found")
        }

        console.log(`Starting thumbnail processing pipeline for videoId=${videoId}`)
        emitProcessingEvent("thumbnail-progress", { videoId, progress: 12 })
        await job.updateProgress(12)
        const result = await processThumbnailPipeline(videoId, async (progress) => {
            emitProcessingEvent("thumbnail-progress", { videoId, progress })
            await job.updateProgress(progress)
        })
        console.log(`Thumbnail processing complete for videoId=${videoId}, result key=${result}`)

        console.log(`Updating video record with thumbnail key for videoId=${videoId}`)
        await job.updateProgress(100)
        emitProcessingEvent("thumbnail-completed", { videoId, thumbnailKey: result, progress: 100 })
        console.log(`Thumbnail job progress set to 100% for videoId=${videoId}`)

        return { thumbnail: result }

    },
    {
        // ✅ FIX: correct Redis config
        connection: redisConnection as any,
        skipVersionCheck: true,
        concurrency: 5
    }
)

/* ---------------- EVENTS ---------------- */

worker.on("completed", (job) => {
    console.log("Thumbnail generated:", job.id)
})

worker.on("failed", (job, err) => {
    console.error("Thumbnail job failed:", job?.id, err)
    emitProcessingEvent("thumbnail-failed", { videoId: job?.data?.videoId })
})

export default worker
