import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import { QueueEvents } from "bullmq"

import app from "./app"
import { redisConnection } from "./config/redis"

dotenv.config()

const PORT = process.env.PORT || 5000

const server = http.createServer(app)

export const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
})

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id)
  })
})

const queueEvents = new QueueEvents("videoAIQueue", {
  connection: redisConnection as any
})

queueEvents.on("progress", ({ data }) => {

  const progress =
    typeof data === "number"
      ? data
      : data?.progress ?? 0

  const videoId =
    typeof data === "object"
      ? data.videoId
      : null

  if (!videoId) return

  io.emit("ai-progress", { videoId, progress })

})

queueEvents.on("completed", ({ returnvalue }) => {

  const videoId = returnvalue?.videoId

  if (!videoId) return

  io.emit("ai-completed", { videoId })

})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})