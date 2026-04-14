import fs from "fs"
import os from "os"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { prisma } from "../../config/prisma"
import { s3 } from "../../config/s3"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { generateThumbnail } from "../../utils/thumbnail"
import { videoAIQueue } from "../../queues/video-ai.queue"
import { videoMetadataQueue } from "../../services/video-processing.service"
import { pipeline } from "stream/promises"

const execAsync = promisify(exec)
const MAX_SPRITE_FRAMES = 120

export const processVideoAfterUpload = async (
    videoId: number,
    s3Key: string,
    channelUsername: string,
    initialDescription?: string
) => {
    let tempVideoPath = ""
    let tempThumbnailPath = ""
    let tempSpritePath = ""

    const generateSpritesheet = async () => {
        tempSpritePath = path.join(os.tmpdir(), `${videoId}_spritesheet.jpg`)

        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempVideoPath}"`
        )

        const duration = Math.max(1, Math.floor(Number.parseFloat(stdout) || 1))
        const totalFrames = Math.max(1, Math.min(MAX_SPRITE_FRAMES, duration))

        const cols = Math.min(10, totalFrames)
        const rows = Math.ceil(totalFrames / cols)
        const frameWidth = 160
        const frameHeight = 90

        const sheetCommand =
            `ffmpeg -t ${totalFrames} -i "${tempVideoPath}" ` +
            `-vf "fps=1,scale=${frameWidth}:${frameHeight}:force_original_aspect_ratio=decrease,pad=${frameWidth}:${frameHeight}:(ow-iw)/2:(oh-ih)/2,tile=${cols}x${rows}" ` +
            `-frames:v 1 -q:v 3 -y "${tempSpritePath}"`

        await execAsync(sheetCommand)

        const spritesheetKey = `${channelUsername}/spritesheets/${videoId}/sheet.jpg`
        const metaKey = `${channelUsername}/spritesheets/${videoId}/meta.json`

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: spritesheetKey,
                Body: fs.createReadStream(tempSpritePath),
                ContentType: "image/jpeg"
            })
        )

        const meta = {
            frameWidth,
            frameHeight,
            cols,
            rows,
            totalFrames,
            intervalSec: 1
        }

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: metaKey,
                Body: JSON.stringify(meta),
                ContentType: "application/json"
            })
        )
    }

    try {
        tempVideoPath = path.join(os.tmpdir(), `${videoId}_video.mp4`)

        const object = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET!,
                Key: s3Key
            })
        )

        await pipeline(object.Body as any, fs.createWriteStream(tempVideoPath))

        const currentVideo = await prisma.video.findUnique({
            where: { id: videoId },
            select: { thumbnailKey: true }
        })

        if (!currentVideo?.thumbnailKey) {
            tempThumbnailPath = path.join(os.tmpdir(), `${videoId}_thumb.jpg`)

            await generateThumbnail(tempVideoPath, tempThumbnailPath)

            const thumbnailKey = `${channelUsername}/thumbnails/${Date.now()}.jpg`

            const buffer = fs.readFileSync(tempThumbnailPath)

            await s3.send(
                new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET!,
                    Key: thumbnailKey,
                    Body: buffer,
                    ContentType: "image/jpeg"
                })
            )

            await prisma.video.update({
                where: { id: videoId },
                data: { thumbnailKey }
            })
        }

        try {
            await generateSpritesheet()
        } catch (spriteError) {
            console.error("Spritesheet generation failed:", spriteError)
        }

        await prisma.videoAI.upsert({
            where: { videoId },
            update: {
                status: "pending",
                ...(initialDescription?.trim()
                    ? { aiDescription: initialDescription.trim() }
                    : {})
            },
            create: {
                videoId,
                status: "pending",
                aiDescription: initialDescription?.trim() || null,
                keywords: [],
                tags: []
            }
        })

        await videoAIQueue.add(
            "processVideoAI",
            { videoId },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )

        await videoMetadataQueue.add(
            "extractVideoMetadata",
            { videoId },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        )

    } catch (error) {

        await prisma.videoAI.upsert({
            where: { videoId },
            update: {
                status: "failed"
            },
            create: {
                videoId,
                status: "failed",
                keywords: [],
                tags: []
            }
        })

        throw error

    } finally {

        if (tempVideoPath && fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)
        if (tempThumbnailPath && fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath)
        if (tempSpritePath && fs.existsSync(tempSpritePath)) fs.unlinkSync(tempSpritePath)

    }

}
