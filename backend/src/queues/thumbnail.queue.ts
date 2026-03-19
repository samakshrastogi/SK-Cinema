import { Queue } from "bullmq";

export const thumbnailQueue = new Queue("thumbnailQueue", {
    connection: {
        url: process.env.REDIS_URL!
    }
});