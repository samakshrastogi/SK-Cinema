// @ts-nocheck
import fs from "fs"
import os from "os"
import path from "path"
import { execFile } from "child_process"
import { promisify } from "util"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { Worker, Job } from "bullmq"
import { pipeline } from "stream/promises"
import { prisma } from "../config/prisma"
import { redisConnection } from "../config/redis"
import { s3 } from "../config/s3"
import { FFMPEG_PATH } from "../config/ffmpeg"
import { logger } from "../utils/logger"

const execFileAsync = promisify(execFile)
const segmentSeconds = Math.max(2, Math.min(10, Number(process.env.HLS_SEGMENT_SECONDS) || 4))
const variants = [
    { name: "360p", width: 640, height: 360, bitrate: "700k", maxrate: "800k", bufsize: "1200k", bandwidth: 900000 },
    { name: "480p", width: 854, height: 480, bitrate: "1200k", maxrate: "1400k", bufsize: "2100k", bandwidth: 1550000 },
    { name: "720p", width: 1280, height: 720, bitrate: "2500k", maxrate: "2850k", bufsize: "4200k", bandwidth: 3000000 },
    { name: "1080p", width: 1920, height: 1080, bitrate: "4500k", maxrate: "5000k", bufsize: "7500k", bandwidth: 5300000 }
]

const uploadDirectory = async (directory: string, prefix: string) => {
    const visit = async (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const absolute = path.join(current, entry.name)
            if (entry.isDirectory()) await visit(absolute)
            else {
                const relative = path.relative(directory, absolute).split(path.sep).join("/")
                const manifest = entry.name.endsWith(".m3u8")
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET!,
                    Key: `${prefix}/${relative}`,
                    Body: fs.createReadStream(absolute),
                    ContentType: manifest ? "application/vnd.apple.mpegurl" : "video/mp2t",
                    CacheControl: manifest ? "public, max-age=60" : "public, max-age=31536000, immutable"
                }))
            }
        }
    }
    await visit(directory)
}

const processHls = async (videoId: string, s3Key: string, channelUsername: string) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `mediaflow-hls-${videoId}-`))
    const input = path.join(root, "source")
    const output = path.join(root, "hls")
    fs.mkdirSync(output)
    await prisma.video.update({ where: { id: videoId }, data: { hlsStatus: "processing", hlsError: null } })

    try {
        const object = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET!, Key: s3Key }))
        await pipeline(object.Body as any, fs.createWriteStream(input))
        const probe = await execFileAsync(FFMPEG_PATH, ["-i", input, "-hide_banner"], { windowsHide: true })
            .catch((error: any) => ({ stderr: error.stderr || "" }))
        const dimensions = String(probe.stderr).match(/Video:.*? (\d{2,5})x(\d{2,5})/)
        const sourceWidth = Number(dimensions?.[1]) || 1280
        const sourceHeight = Number(dimensions?.[2]) || 720
        const portrait = sourceHeight > sourceWidth
        const sourceEdge = portrait ? sourceWidth : sourceHeight
        let selected = variants.filter((item) => item.height <= sourceEdge)
        if (!selected.length) selected = [variants[0]]

        for (const item of selected) {
            const width = portrait ? item.height : item.width
            const height = portrait ? item.width : item.height
            const rendition = path.join(output, item.name)
            fs.mkdirSync(rendition)
            await execFileAsync(FFMPEG_PATH, [
                "-i", input,
                "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
                "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p",
                "-b:v", item.bitrate, "-maxrate", item.maxrate, "-bufsize", item.bufsize,
                "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000",
                "-force_key_frames", `expr:gte(t,n_forced*${segmentSeconds})`,
                "-hls_time", String(segmentSeconds), "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
                "-hls_segment_filename", path.join(rendition, "segment_%05d.ts"),
                path.join(rendition, "index.m3u8"), "-y"
            ], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
        }

        const master = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"]
        for (const item of selected) {
            const width = portrait ? item.height : item.width
            const height = portrait ? item.width : item.height
            master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${item.bandwidth},RESOLUTION=${width}x${height}`, `${item.name}/index.m3u8`)
        }
        fs.writeFileSync(path.join(output, "master.m3u8"), `${master.join("\n")}\n`)
        const prefix = `${channelUsername}/hls/${videoId}`
        await uploadDirectory(output, prefix)
        await prisma.video.update({ where: { id: videoId }, data: { hlsMasterKey: `${prefix}/master.m3u8`, hlsStatus: "ready", hlsError: null } })
    } catch (error) {
        await prisma.video.update({ where: { id: videoId }, data: { hlsStatus: "failed", hlsError: String(error).slice(0, 500) } }).catch(() => undefined)
        throw error
    } finally {
        fs.rmSync(root, { recursive: true, force: true })
    }
}

const worker = new Worker("hlsProcessingQueue", async (job: Job) => {
    const { videoId, s3Key, channelUsername } = job.data || {}
    if (!videoId || !s3Key || !channelUsername) throw new Error("Invalid adaptive HLS job")
    await processHls(videoId, s3Key, channelUsername)
}, {
    connection: redisConnection as any,
    skipVersionCheck: true,
    concurrency: Math.max(1, Number(process.env.HLS_WORKER_CONCURRENCY) || 1),
    lockDuration: 60 * 60 * 1000,
    stalledInterval: 5 * 60 * 1000
})

worker.on("completed", () => logger.info("HLS_WORKER", "Adaptive HLS package is ready"))
worker.on("failed", (_job, error) => logger.error("HLS_WORKER", "Adaptive HLS generation failed", { error }))
worker.on("error", (error) => logger.error("HLS_WORKER", "Adaptive HLS worker error", { error }))
