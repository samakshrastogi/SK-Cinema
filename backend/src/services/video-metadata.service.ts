// @ts-nocheck
import ffmpeg from "fluent-ffmpeg"
import { prisma } from "../config/prisma"
import { s3 } from "../config/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { pipeline } from "stream/promises"
import fs from "fs"
import os from "os"
import path from "path"

export const extractVideoMetadata = async (videoId: string) => {

    const video = await prisma.video.findUnique({
        where: { id: videoId }
    })

    if (!video) throw new Error("Video not found")

    const tempPath = path.join(os.tmpdir(), `${video.publicId}.mp4`)

    // download from S3
    const object = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: video.s3Key
        })
    )

    await pipeline(object.Body as any, fs.createWriteStream(tempPath))

    const probeData: any = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, data) => {
            if (err) reject(err)
            else resolve(data)
        })
    })

    const videoStream = probeData.streams.find((s: any) => s.codec_type === "video")
    const audioStream = probeData.streams.find((s: any) => s.codec_type === "audio")

    const duration = Math.floor(probeData.format.duration || 0)
    const fps = eval(videoStream.avg_frame_rate) || 0

    const width = videoStream.width
    const height = videoStream.height

    let orientation = "LANDSCAPE"
    if (height > width) orientation = "PORTRAIT"
    else if (height === width) orientation = "SQUARE"

    const aspectRatio = `${width}:${height}`

    const totalFrames = Math.floor(duration * fps)

    // Extract device info from various possible locations (avoid codec names)
    const deviceInfo =
        probeData.format?.tags?.model ||
        probeData.format?.tags?.["com.apple.quicktime.model"] ||
        probeData.format?.tags?.["com.apple.quicktime.camerauniqueid"] ||
        videoStream?.tags?.model ||
        null

    const metadata = {
        duration,
        totalFrames,
        width,
        height,
        aspectRatio,
        orientation,
        fps,
        hasAudio: !!audioStream,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name || null,
        deviceInfo
    }

    fs.unlinkSync(tempPath)

    return metadata
}
