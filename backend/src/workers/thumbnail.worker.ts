import { Worker } from "bullmq"
import { redisConnection } from "../config/redis"
import { prisma } from "../config/prisma"
import { processThumbnailPipeline } from "../services/thumbnail.service"

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

        const result = await processThumbnailPipeline(
            video.s3Key,
            process.env.AWS_BUCKET!
        )

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
        connection: redisConnection as any,
        concurrency: 5
    }
)

worker.on("completed", (job) => {
    console.log("Thumbnail generated:", job.id)
})

worker.on("failed", (job, err) => {
    console.error("Thumbnail job failed:", job?.id, err)
})

export default worker