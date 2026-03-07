import Redis from "ioredis"

export const redisConnection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,

    maxRetriesPerRequest: null,

    enableReadyCheck: true,

    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000)
        return delay
    },

    reconnectOnError(err) {
        const targetError = "READONLY"
        if (err.message.includes(targetError)) {
            return true
        }
        return false
    }
})

redisConnection.on("connect", () => {
    console.log("Redis connected")
})

redisConnection.on("error", (err) => {
    console.error("Redis error:", err)
})

redisConnection.on("reconnecting", () => {
    console.log("Redis reconnecting...")
})