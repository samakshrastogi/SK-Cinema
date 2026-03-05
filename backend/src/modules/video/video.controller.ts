import { Response } from "express";
import {
    generatePresignedUrl,
    completeUpload,
    scanS3Videos,
    getVideoById,
    getAllVideos,
} from "./video.service";
import { prisma } from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const getPresignedUrl = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({
                message: "fileName and fileType are required",
            });
        }

        const result = await generatePresignedUrl(
            req.user.id,
            fileName,
            fileType
        );

        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({
            message: error.message || "Failed to generate upload URL",
        });
    }
};

export const finishUpload = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { key, title, size } = req.body;

        if (!key || !title || !size) {
            return res.status(400).json({
                message: "key, title and size are required",
            });
        }

        const video = await completeUpload(
            req.user.id,
            key,
            title,
            Number(size)
        );

        return res.status(201).json({
            ...video,
            size: video.size.toString(),
        });
    } catch (error: any) {
        return res.status(500).json({
            message: error.message || "Failed to complete upload",
        });
    }
};

export const handleScanS3 = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const summary = await scanS3Videos(req.user.id);
        return res.json(summary);
    } catch (error: any) {
        return res.status(500).json({
            message: error.message || "Failed to scan S3",
        });
    }
};

export const importSelectedVideos = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { keys } = req.body;

        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                message: "keys array is required",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { channel: true },
        });

        if (!user || !user.channel) {
            return res.status(400).json({
                message: "Channel not found",
            });
        }

        const imported: string[] = [];

        for (const key of keys) {
            const exists = await prisma.video.findUnique({
                where: { s3Key: key },
            });

            if (!exists) {
                await prisma.video.create({
                    data: {
                        title: key.split("/").pop() || "Untitled",
                        s3Key: key,
                        size: BigInt(0),
                        uploadSource: "S3_IMPORT",
                        status: "UPLOADED",
                        channelId: user.channel.id,
                    },
                });

                imported.push(key);
            }
        }

        return res.json({
            importedCount: imported.length,
            imported,
        });
    } catch (error: any) {
        return res.status(500).json({
            message: error.message || "Failed to import videos",
        });
    }
};

export const handleGetVideos = async (
    _req: any,
    res: Response
) => {
    try {
        const videos = await getAllVideos();

        return res.json(
            videos.map((video) => ({
                ...video,
                size: video.size.toString(),
            }))
        );
    } catch {
        return res.status(500).json({
            message: "Failed to fetch videos",
        });
    }
};

export const handleGetVideoById = async (
    req: any,
    res: Response
) => {
    try {
        const id = Number(req.params.id);

        const video = await getVideoById(id);

        return res.json(video);
    } catch (error: any) {
        return res.status(404).json({
            message: error.message || "Video not found",
        });
    }
};