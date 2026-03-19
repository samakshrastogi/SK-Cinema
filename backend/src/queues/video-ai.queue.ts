import { Queue } from "bullmq";

/* ---------------- QUEUE ---------------- */

export const videoAIQueue = new Queue("videoAIQueue", {
    connection: {
        url: process.env.REDIS_URL!
    },

    defaultJobOptions: {
        attempts: 3,

        backoff: {
            type: "exponential",
            delay: 5000
        },

        removeOnComplete: {
            age: 3600 // 1 hour
        },

        removeOnFail: {
            age: 24 * 3600 // 24 hours
        }
    }
});

/* ---------------- ADD AI JOB ---------------- */

export const addVideoAIJob = async (videoId: number) => {

    const jobId = `video-ai-${videoId}`;

    const existingJob = await videoAIQueue.getJob(jobId);

    if (existingJob) {
        return existingJob;
    }

    const job = await videoAIQueue.add(
        "processVideoAI",
        { videoId },
        {
            jobId,
            priority: 1
        }
    );

    console.log("AI job queued:", jobId);

    return job;
};