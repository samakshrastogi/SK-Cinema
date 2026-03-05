import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const thumbnailQueue = new Queue("thumbnailQueue", {
    connection: redisConnection,
});