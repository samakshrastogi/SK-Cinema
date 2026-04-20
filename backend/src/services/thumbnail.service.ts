// @ts-nocheck
import fs from "fs";
import os from "os";
import path from "path";

import { s3 } from "../config/s3";
import { prisma } from "../config/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { generateMultipleThumbnails } from "./ffmpeg.service";
import { selectBestThumbnail } from "./selector.service";
import { optimizeThumbnail } from "./optimizer.service";

export const processThumbnailPipeline = async (
    videoId: string,
    onProgress?: (progress: number) => void
) => {

    const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { channel: true }
    });

    if (!video || !video.channel) {
        throw new Error("Video or channel not found");
    }

    const tempDir = path.join(os.tmpdir(), `thumb-${videoId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const tempVideoPath = path.join(tempDir, "video.mp4");

    const object = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: video.s3Key
        })
    );

    const stream = object.Body as any;

    onProgress?.(18)

    await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempVideoPath);
        stream.pipe(writeStream);
        stream.on("error", reject);
        writeStream.on("finish", () => resolve(null)); // ✅ FIXED
    });

    onProgress?.(34)
    const thumbnails = await generateMultipleThumbnails(
        tempVideoPath,
        tempDir
    );

    onProgress?.(56)
    const best = await selectBestThumbnail(thumbnails);

    const optimizedPath = path.join(tempDir, "optimized.webp");

    onProgress?.(72)
    await optimizeThumbnail(best, optimizedPath);

    const thumbnailKey =
        `${video.channel.username}/thumbnails/${videoId}.webp`;

    /* ✅ DIRECT S3 UPLOAD (no external function needed) */
    const fileBuffer = fs.readFileSync(optimizedPath);

    onProgress?.(88)
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: thumbnailKey,
            Body: fileBuffer,
            ContentType: "image/webp"
        })
    );

    await prisma.video.update({
        where: { id: videoId },
        data: {
            thumbnailKey
        }
    });

    onProgress?.(100)

    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { }

    return thumbnailKey;
};
