import { Worker, Job } from "bullmq"
import { prisma } from "../config/prisma"
import fs from "fs"
import os from "os"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { exec } from "child_process"
import axios from "axios"
import { s3 } from "../config/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { pipeline } from "stream/promises"
import { redisConnection } from "../config/redis"

ffmpeg.setFfmpegPath("ffmpeg")

const extractAudio = (videoPath: string, audioPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec("libmp3lame")
            .save(audioPath)
            .on("end", () => resolve())
            .on("error", reject)
    })
}

const runWhisper = (audioPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {

        const outputDir = os.tmpdir()

        exec(
            `whisper "${audioPath}" --model base --output_format txt --output_dir "${outputDir}"`,
            (error) => {

                if (error) {
                    reject(error)
                    return
                }

                const transcriptFile = path.join(
                    outputDir,
                    path.basename(audioPath).replace(".mp3", ".txt")
                )

                if (!fs.existsSync(transcriptFile)) {
                    reject(new Error("Transcript file not generated"))
                    return
                }

                const transcript = fs.readFileSync(transcriptFile, "utf-8")
                resolve(transcript)
            }
        )

    })
}

const runOllama = async (transcript: string) => {

    const prompt = `
Return ONLY valid JSON.

{
"title":"string",
"description":"string",
"keywords":["string"],
"tags":["string"]
}

Transcript:
${transcript}
`

    const response = await axios.post(
        "http://localhost:11434/api/generate",
        {
            model: "phi3",
            prompt,
            stream: false,
            options: {
                temperature: 0,
                num_predict: 600
            }
        }
    )

    return response.data.response
}

const extractJSON = (text: string) => {

    try {

        const first = text.indexOf("{")
        const last = text.lastIndexOf("}")

        if (first === -1 || last === -1) return {}

        return JSON.parse(text.substring(first, last + 1))

    } catch {
        return {}
    }

}

const normalizeArray = (value: any) => {

    if (Array.isArray(value)) return value

    if (typeof value === "string") {
        return value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
    }

    return []

}

const shortenTranscript = (text: string) => {
    const words = text.split(/\s+/)
    return words.slice(0, 300).join(" ")
}

const processVideoAI = async (job: Job) => {

    const start = Date.now()
    const { videoId } = job.data

    console.log("AI Worker started:", videoId)

    const updateProgress = async (progress: number) => {
        await job.updateProgress({ videoId, progress })
    }

    await updateProgress(5)

    const video = await prisma.video.findUnique({
        where: { id: videoId }
    })

    if (!video) throw new Error("Video not found")

    const tempVideoPath = path.join(os.tmpdir(), `${videoId}_video.mp4`)
    const tempAudioPath = path.join(os.tmpdir(), `${videoId}_audio.mp3`)

    try {

        await prisma.videoAI.update({
            where: { videoId },
            data: { status: "processing" }
        })

        console.log("Downloading video")

        const object = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: video.s3Key
            })
        )

        await pipeline(object.Body as any, fs.createWriteStream(tempVideoPath))

        await updateProgress(25)

        console.log("Extracting audio")

        await extractAudio(tempVideoPath, tempAudioPath)

        await updateProgress(45)

        console.log("Running whisper")

        const transcript = await runWhisper(tempAudioPath)

        await updateProgress(65)

        console.log("Generating metadata")

        const rawResponse = await runOllama(shortenTranscript(transcript))

        console.log("OLLAMA RAW:", rawResponse)

        const parsed = extractJSON(rawResponse)

        const keywords = normalizeArray(parsed.keywords)
        const tags = normalizeArray(parsed.tags)

        const aiTitle =
            typeof parsed.title === "string"
                ? parsed.title
                : transcript.split(".")[0].slice(0, 80)

        const aiDescription =
            typeof parsed.description === "string"
                ? parsed.description
                : transcript.slice(0, 200)

        await updateProgress(90)

        await prisma.videoAI.update({
            where: { videoId },
            data: {
                transcript,
                keywords,
                tags,
                aiTitle,
                aiDescription,
                status: "completed"
            }
        })

        await updateProgress(100)

        console.log("AI completed:", videoId)
        console.log("AI time:", Date.now() - start, "ms")

        return { videoId }

    } catch (error) {

        console.error("AI job failed:", videoId, error)

        await prisma.videoAI.update({
            where: { videoId },
            data: { status: "failed" }
        })

        throw error

    } finally {

        try {
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)
            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath)
        } catch { }

    }

}

const worker = new Worker(
    "videoAIQueue",
    processVideoAI,
    {
        connection: redisConnection as any,
        concurrency: 3,
        limiter: {
            max: 10,
            duration: 1000
        }
    }
)

worker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`)
})

worker.on("failed", (job, err) => {
    console.error(`Job failed: ${job?.id}`, err)
})

export default worker