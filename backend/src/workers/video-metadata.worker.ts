import { Worker, Job } from "bullmq"
import { redisConnection } from "../config/redis"
import { prisma } from "../config/prisma"
import { extractVideoMetadata } from "../services/video-metadata.service"

new Worker(
    "videoMetadataQueue",
    async (job: Job) => {

        const { videoId } = job.data

        console.log("[metadata] started", videoId)

        const metadata = await extractVideoMetadata(videoId)

        await prisma.videoMetadata.upsert({
            where: { videoId },
            update: metadata,
            create: {
                videoId,
                ...metadata
            }
        })

        console.log("[metadata] completed", videoId)
    },
    {
        connection: redisConnection as any,
        concurrency: 2
    }
)