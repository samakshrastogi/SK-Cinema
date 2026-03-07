import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import { QueueEvents } from "bullmq"

import app from "./app"
import { redisConnection } from "./config/redis"

dotenv.config()

const PORT = process.env.PORT || 5000

const server = http.createServer(app)

/* ---------------- SOCKET.IO SERVER ---------------- */

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

io.on("connection", (socket) => {

  console.log("Client connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })

})

/* ---------------- BULLMQ QUEUE EVENTS ---------------- */

const queueEvents = new QueueEvents("videoAIQueue", {
  connection: redisConnection as any
})

queueEvents.on("progress", ({ data }) => {

  try {

    const progress =
      typeof data === "number"
        ? data
        : data?.progress ?? 0

    const videoId =
      typeof data === "object"
        ? data.videoId
        : null

    if (!videoId) return

    io.emit("ai-progress", {
      videoId,
      progress
    })

  } catch (error) {

    console.error("Progress event error:", error)

  }

})

queueEvents.on("completed", ({ returnvalue }) => {

  try {

    const videoId = returnvalue?.videoId

    if (!videoId) return

    io.emit("ai-completed", {
      videoId
    })

  } catch (error) {

    console.error("Completed event error:", error)

  }

})

queueEvents.on("failed", ({ failedReason }) => {

  console.error("AI job failed:", failedReason)

})

queueEvents.on("error", (error) => {

  console.error("QueueEvents error:", error)

})

/* ---------------- START SERVER ---------------- */

server.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`)

})