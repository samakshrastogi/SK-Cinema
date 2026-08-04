import http from "http";
import { Server } from "socket.io";
import { QueueEvents } from "bullmq";

import "./config/env";
import app from "./app";
import { setSocketServer } from "./services/realtime.service";
import { logger } from "./utils/logger";
import { corsOrigin } from "./config/cors";
import { prisma } from "./config/prisma";

const PORT = process.env.PORT;

const server = http.createServer(app);

export const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ---------------- SOCKET ---------------- */

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
  });
});

setSocketServer(io);

if (process.env.ENABLE_REDIS_QUEUE_EVENTS === "true") {
  const { redisConnection } = require("./config/redis");
  const queueEvents = new QueueEvents("videoAIQueue", {
    connection: redisConnection as any
  });

  queueEvents.on("progress", ({ data }) => {
    const progress =
      typeof data === "object" && data !== null && "progress" in data
        ? (data as any).progress
        : typeof data === "number"
          ? data
          : 0;

    const videoId =
      typeof data === "object" && data !== null && "videoId" in data
        ? (data as any).videoId
        : null;

    if (!videoId) return;

    io.emit("ai-progress", { videoId, progress });
  });

  queueEvents.on("completed", ({ returnvalue }) => {
    let videoId: string | null = null;

    if (returnvalue && typeof returnvalue === "object") {
      const data = returnvalue as { videoId?: string };

      if (typeof data.videoId === "string") {
        videoId = data.videoId;
      }
    }

    if (!videoId) return;

    io.emit("ai-completed", { videoId });
  });

  queueEvents.on("error", (error) => {
    logger.error("QUEUE_EVENTS", "Queue events Redis error", { error });
  });
}

/* ---------------- START SERVER ---------------- */

const startServer = async () => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    logger.info("DATABASE", "MongoDB connectivity verified");

    server.listen(PORT, () => {
      logger.info("SERVER", "Backend server is ready", { port: PORT });
    });
  } catch (error) {
    logger.error("DATABASE", "Backend startup stopped because MongoDB is unavailable", { error });
    process.exit(1);
  }
};

void startServer();
