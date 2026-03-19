import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { QueueEvents } from "bullmq";

import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

export const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: process.env.CLIENT_URL!,
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ---------------- SOCKET ---------------- */

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------------- QUEUE EVENTS ---------------- */

const queueEvents = new QueueEvents("videoAIQueue", {
  connection: {
    url: process.env.REDIS_URL!
  }
});

/* ---------------- PROGRESS EVENT ---------------- */

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

/* ---------------- COMPLETED EVENT ---------------- */

queueEvents.on("completed", ({ returnvalue }) => {

  let videoId: number | null = null;

  if (returnvalue && typeof returnvalue === "object") {
    const data = returnvalue as { videoId?: number };

    if (typeof data.videoId === "number") {
      videoId = data.videoId;
    }
  }

  if (!videoId) return;

  io.emit("ai-completed", { videoId });

});

/* ---------------- START SERVER ---------------- */

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});