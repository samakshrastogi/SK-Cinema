import Redis from "ioredis";

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL not defined ❌");
}

/* ---------------- PARSE URL ---------------- */

const url = new URL(process.env.REDIS_URL);

/* ---------------- REDIS CONNECTION ---------------- */

export const redisConnection = new Redis({
    host: url.hostname,
    port: Number(url.port),
    username: url.username,
    password: url.password,

    tls: {
        rejectUnauthorized: false,
    },

    maxRetriesPerRequest: null,
});

/* ---------------- LOGS ---------------- */

redisConnection.on("connect", () => {
    console.log("✅ Redis connected");
});

redisConnection.on("ready", () => {
    console.log("🚀 Redis ready");
});

redisConnection.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
});