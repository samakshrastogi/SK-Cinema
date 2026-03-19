import Redis from "ioredis";

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined ❌");
}

export const redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: {}, // ⭐ THIS IS THE FIX
});

redisConnection.on("connect", () => {
    console.log("✅ Redis connected");
});

redisConnection.on("error", (err) => {
    console.error("❌ Redis error:", err);
});