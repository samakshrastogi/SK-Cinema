import fs from "fs";
import os from "os";
import path from "path";

import { s3 } from "../config/s3";
import { prisma } from "../config/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { generateMultipleThumbnails } from "./ffmpeg.service";
import { selectBestThumbnail } from "./selector.service";
import { optimizeThumbnail } from "./optimizer.service";
import { uploadToS3 } from "./s3.service";

export const processThumbnailPipeline = async (videoId: number) => {

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

    await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempVideoPath);
        stream.pipe(writeStream);
        stream.on("error", reject);
        writeStream.on("finish", resolve);
    });

    const thumbnails = await generateMultipleThumbnails(
        tempVideoPath,
        tempDir
    );

    const best = await selectBestThumbnail(thumbnails);

    const optimizedPath = path.join(tempDir, "optimized.webp");

    await optimizeThumbnail(best, optimizedPath);

    const thumbnailKey =
        `${video.channel.username}/thumbnails/${videoId}.webp`;

    await uploadToS3(
        process.env.AWS_BUCKET!,
        thumbnailKey,
        optimizedPath
    );

    await prisma.video.update({
        where: { id: videoId },
        data: {
            thumbnailKey
        }
    });

    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { }

    return thumbnailKey;
};