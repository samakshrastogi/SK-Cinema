import { Worker, Job } from "bullmq"
import { redisConnection } from "../config/redis"
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

ffmpeg.setFfmpegPath("ffmpeg")

/* ---------------- AUDIO EXTRACTION ---------------- */

const extractAudio = (videoPath: string, audioPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec("libmp3lame")
            .save(audioPath)
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
    })
}

/* ---------------- WHISPER ---------------- */

const runWhisper = (audioPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {

        const outputDir = os.tmpdir()

        exec(
            `whisper "${audioPath}" --model base --output_format txt --output_dir "${outputDir}"`,
            (error, stdout, stderr) => {

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

/* ---------------- OLLAMA ---------------- */

const runOllama = async (transcript: string) => {

    const prompt = `
Return ONLY valid JSON.

{
"title":"",
"description":"",
"keywords":[],
"tags":[]
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
                num_predict: 120
            }
        }
    )

    return response.data.response
}

/* ---------------- HELPERS ---------------- */

const shortenTranscript = (text: string) => {
    const words = text.split(/\s+/)
    return words.slice(0, 300).join(" ")
}

const extractJSON = (text: string) => {

    const match = text.match(/\{[\s\S]*\}/)

    if (!match) return {}

    try {
        return JSON.parse(match[0])
    } catch {
        return {}
    }

}

/* ---------------- AI PROCESS ---------------- */

const processVideoAI = async (job: Job) => {

    const start = Date.now()

    const { videoId } = job.data

    console.log("AI Worker started:", videoId)

    const sendProgress = async (progress: number) => {
        await job.updateProgress({ videoId, progress })
    }

    await sendProgress(5)

    const video = await prisma.video.findUnique({
        where: { id: videoId }
    })

    if (!video) {
        throw new Error("Video not found")
    }

    const tempVideoPath = path.join(os.tmpdir(), `${videoId}_video.mp4`)
    const tempAudioPath = path.join(os.tmpdir(), `${videoId}_audio.mp3`)

    try {

        await prisma.videoAI.update({
            where: { videoId },
            data: { status: "processing" }
        })

        /* ---------------- DOWNLOAD VIDEO ---------------- */

        console.log("Downloading video")

        const object = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: video.s3Key
            })
        )

        await pipeline(object.Body as any, fs.createWriteStream(tempVideoPath))

        await sendProgress(25)

        /* ---------------- AUDIO EXTRACTION ---------------- */

        console.log("Extracting audio")

        await extractAudio(tempVideoPath, tempAudioPath)

        await sendProgress(45)

        /* ---------------- WHISPER ---------------- */

        console.log("Running whisper")

        const transcript = await runWhisper(tempAudioPath)

        await sendProgress(65)

        /* ---------------- OLLAMA ---------------- */

        console.log("Generating metadata")

        const shortTranscript = shortenTranscript(transcript)

        const rawResponse = await runOllama(shortTranscript)

        const parsed = extractJSON(rawResponse)

        const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : []
        const tags = Array.isArray(parsed.tags) ? parsed.tags : []

        const aiTitle = parsed.title || null
        const aiDescription = parsed.description || null

        await sendProgress(90)

        /* ---------------- SAVE AI DATA ---------------- */

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

        await sendProgress(100)

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

        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath)

    }

}

/* ---------------- WORKER ---------------- */

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