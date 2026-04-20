import { Worker, Job } from "bullmq"
import { prisma } from "../config/prisma"
import fs from "fs"
import os from "os"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { exec } from "child_process"
import axios from "axios"
import { redisConnection } from "../config/redis"
import { s3 } from "../config/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { pipeline } from "stream/promises"

ffmpeg.setFfmpegPath("ffmpeg")

const log = (...args: any[]) => console.log(...args)
const now = () => Date.now()
const timeTaken = (start: number) => `${((Date.now() - start) / 1000).toFixed(2)}s`

const ensureExists = (filePath: string) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not created: ${filePath}`)
    }
}

const safeDelete = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (err) {
        console.error("Delete error:", filePath, err)
    }
}

const runWhisper = (audioPath: string, outputDir: string): Promise<string> => {
    return new Promise((resolve, reject) => {

        const start = now()

        const cmd = `whisper "${audioPath}" \
--model tiny.en \
--fp16 False \
--threads 4 \
--language en \
--output_dir "${outputDir}"`

        log("🎤 Whisper started")

        exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {

            log(`⏱ Whisper finished in ${timeTaken(start)}`)

            if (err) {
                console.error("Whisper error:", stderr)
                return reject(err)
            }

            const transcript = stdout
                .split("\n")
                .filter(l => l.includes("-->"))
                .map(l => l.replace(/\[.*?\]/, "").trim())
                .join(" ")

            if (!transcript) return reject(new Error("Transcript empty"))

            resolve(transcript)
        })
    })
}

const runOllama = async (prompt: string): Promise<string> => {
    const start = now()

    log("🤖 Ollama started")

    const res = await axios.post(
        "http://localhost:11434/api/generate",
        {
            model: "phi3",
            prompt,
            stream: false,
            options: {
                num_predict: 120,
                temperature: 0.7
            }
        },
        {
            timeout: 300000 // ✅ 5 minutes
        }
    )

    log(`⏱ Ollama finished in ${timeTaken(start)}`)

    return res.data.response
}

const extractJSON = (text: string) => {
    try {
        const match = text.match(/\{[\s\S]*\}/)
        return match ? JSON.parse(match[0]) : {}
    } catch {
        return {}
    }
}

const normalizeArray = (val: any) => {
    if (Array.isArray(val)) return val
    if (typeof val === "string") return val.split(",").map(v => v.trim()).filter(Boolean)
    return []
}

const shorten = (text: string) =>
    text.split(/\s+/).slice(0, 120).join(" ")

const generateTitle = (text: string) => {
    const first = text.split(".")[0]
    return first.length > 20 ? first.slice(0, 80) : "Interesting Video Content"
}

const generateDescription = (text: string) => {
    const sentences = text.split(".").slice(0, 2).join(".")
    return sentences.length > 30
        ? sentences
        : "This video explains useful insights from the uploaded content."
}

const processVideoAI = async (job: Job) => {

    const totalStart = now()
    const { videoId } = job.data
    const updateProgress = async (progress: number) => {
        await job.updateProgress({ videoId, progress })
    }

    log(`\n🚀 JOB STARTED → Video ${videoId}`)

    const uniqueId = `${videoId}-${Date.now()}`
    const tmpDir = os.tmpdir()

    const tempVideo = path.join(tmpDir, `${uniqueId}.mp4`)
    const tempAudio = path.join(tmpDir, `${uniqueId}.mp3`)

    const createdFiles: string[] = []

    try {
        await updateProgress(5)

        const step1 = now()
        const video = await prisma.video.findUnique({ where: { id: videoId } })
        if (!video) throw new Error("Video not found")
        log(`⏱ Fetch video DB: ${timeTaken(step1)}`)
        await updateProgress(12)

        const step2 = now()
        await prisma.videoAI.update({
            where: { videoId },
            data: { status: "processing" }
        })
        log(`⏱ Update DB status: ${timeTaken(step2)}`)
        await updateProgress(18)

        const step3 = now()
        log("⬇️ Downloading video")
        const obj = await s3.send(new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: video.s3Key
        }))

        await pipeline(obj.Body as any, fs.createWriteStream(tempVideo))
        ensureExists(tempVideo)
        createdFiles.push(tempVideo)
        log(`⏱ Download done: ${timeTaken(step3)}`)
        await updateProgress(35)

        const step4 = now()
        log("🎵 Extracting audio")
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideo)
                .noVideo()
                .audioCodec("libmp3lame")
                .audioFrequency(16000)
                .audioChannels(1)
                .duration(60) // ✅ FIXED 60 sec
                .save(tempAudio)
                .on("end", resolve)
                .on("error", reject)
        })
        ensureExists(tempAudio)
        createdFiles.push(tempAudio)
        log(`⏱ Audio extraction: ${timeTaken(step4)}`)
        await updateProgress(55)

        const step5 = now()
        const transcript = await runWhisper(tempAudio, tmpDir)
        log(`⏱ Whisper total: ${timeTaken(step5)}`)
        await updateProgress(72)

        const step6 = now()
        const raw = await runOllama(`
You are a professional content writer.

RETURN ONLY JSON:
{
  "title": "engaging title",
  "description": "clear summary",
  "keywords": ["k1","k2","k3"],
  "tags": ["t1","t2","t3"]
}

Transcript:
${shorten(transcript)}
`)
        log(`⏱ Data generation: ${timeTaken(step6)}`)
        await updateProgress(88)

        const step7 = now()
        const parsed = extractJSON(raw)

        const keywords = normalizeArray(parsed.keywords)
        const tags = normalizeArray(parsed.tags)

        await prisma.videoAI.update({
            where: { videoId },
            data: {
                transcript,
                keywords: keywords.length ? keywords : ["video"],
                tags: tags.length ? tags : ["general"],
                aiTitle: parsed.title || generateTitle(transcript),
                aiDescription: parsed.description || generateDescription(transcript),
                status: "completed"
            }
        })

        log(`⏱ DB save: ${timeTaken(step7)}`)
        await updateProgress(100)

        log(`\n✅ JOB COMPLETED → Video ${videoId}`)
        log(`🔥 TOTAL TIME (Video ${videoId}): ${timeTaken(totalStart)}\n`)
        return { videoId }

    } catch (err) {

        console.error("❌ JOB FAILED", err)

        await prisma.videoAI.update({
            where: { videoId },
            data: { status: "failed" }
        })

        throw err

    } finally {

        const cleanupStart = now()

        for (const file of createdFiles) safeDelete(file)

        log(`🧹 Cleanup done in ${timeTaken(cleanupStart)}`)
    }
}

const worker = new Worker(
    "videoAIQueue",
    processVideoAI,
    {
        connection: redisConnection as any,
        skipVersionCheck: true,
        concurrency: 2
    }
)

worker.on("completed", job => {
    console.log("🎉 Job completed:", job.id)
})

worker.on("failed", (job, err) => {
    console.error("💥 Job failed:", job?.id, err)
})

export default worker
