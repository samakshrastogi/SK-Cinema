import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { processThumbnailPipeline } from "../services/thumbnail.service";

new Worker(
    "thumbnailQueue",
    async (job) => {
        const { inputPath, tempDir, bucket, s3Key } = job.data;

        const result = await processThumbnailPipeline(
            inputPath,
            tempDir,
            bucket,
            s3Key
        );

        return { thumbnail: result };
    },
    { connection: redisConnection }
);