import { Response } from "express"
import {
    generatePresignedUrl,
    completeUpload,
    scanS3Videos,
    getVideoById,
    getAllVideos
} from "./video.service"

import { prisma } from "../../config/prisma"
import { AuthRequest } from "../../middlewares/auth.middleware"
import { processVideoAfterUpload } from "./video-processing.service"

export const getPresignedUrl = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { fileName, fileType } = req.body

        if (!fileName || !fileType) {
            return res.status(400).json({
                success: false,
                message: "fileName and fileType are required"
            })
        }

        const result = await generatePresignedUrl(
            req.user.id,
            fileName,
            fileType
        )

        return res.json({
            success: true,
            data: result
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate upload URL"
        })
    }
}

export const finishUpload = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { key, title, size, visibility } = req.body

        if (!key || !title || !size) {
            return res.status(400).json({
                success: false,
                message: "key, title and size are required"
            })
        }

        const video = await completeUpload(
            req.user.id,
            key,
            title,
            Number(size),
            visibility,
        )

        return res.status(201).json({
            success: true,
            data: {
                ...video,
                size: video.size.toString()
            }
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to complete upload"
        })
    }
}

export const handleScanS3 = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const summary = await scanS3Videos(req.user.id)

        return res.json({
            success: true,
            data: summary
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to scan S3"
        })
    }
}

export const importSelectedVideos = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { keys } = req.body

        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: "keys array is required"
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { channel: true }
        })

        if (!user?.channel) {
            return res.status(400).json({
                success: false,
                message: "Channel not found"
            })
        }

        const imported: string[] = []

        for (const key of keys) {
            const exists = await prisma.video.findUnique({
                where: { s3Key: key }
            })

            if (!exists) {
                const video = await prisma.video.create({
                    data: {
                        title: key.split("/").pop() || "Untitled",
                        s3Key: key,
                        size: BigInt(0),
                        uploadSource: "S3_IMPORT",
                        status: "UPLOADED",
                        channelId: user.channel.id,
                        visibility: "PUBLIC" // ✅ DEFAULT
                    }
                })

                await processVideoAfterUpload(
                    video.id,
                    key,
                    user.channel.username
                )

                imported.push(key)
            }
        }

        return res.json({
            success: true,
            importedCount: imported.length,
            imported
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to import videos"
        })
    }
}

export const handleGetVideos = async (
    _req: AuthRequest,
    res: Response
) => {
    try {
        const videos = await getAllVideos()

        return res.json({
            success: true,
            data: videos.map((video) => ({
                ...video,
                size: video.size.toString()
            }))
        })
    } catch {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch videos"
        })
    }
}

export const handleGetVideoById = async (
    req: AuthRequest,
    res: Response
) => {

    const id = Number(req.params.id)

    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid video id"
        })
    }

    try {

        const video = await getVideoById(id)

        return res.json({
            success: true,
            data: video
        })

    } catch (error: any) {

        return res.status(404).json({
            success: false,
            message: error.message || "Video not found"
        })

    }

}

export const handleGetAIInsights = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const aiVideos = await prisma.videoAI.findMany({
            select: {
                keywords: true,
                tags: true,
                aiTitle: true
            }
        })

        const keywordMap: Record<string, number> = {}
        const tagMap: Record<string, number> = {}
        const titleMap: Record<string, number> = {}

        aiVideos.forEach((video) => {
            video.keywords.forEach((k) => {
                keywordMap[k] = (keywordMap[k] || 0) + 1
            })

            video.tags.forEach((t) => {
                tagMap[t] = (tagMap[t] || 0) + 1
            })

            if (video.aiTitle) {
                titleMap[video.aiTitle] =
                    (titleMap[video.aiTitle] || 0) + 1
            }
        })

        const sortMap = (map: Record<string, number>) =>
            Object.entries(map)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map((x) => x[0])

        return res.json({
            success: true,
            data: {
                totalVideosProcessed: aiVideos.length,
                topKeywords: sortMap(keywordMap),
                topTags: sortMap(tagMap),
                topAITitles: sortMap(titleMap)
            }
        })
    } catch (error) {
        console.error("AI Insights Error:", error)

        return res.status(500).json({
            success: false,
            message: "Failed to fetch AI insights"
        })
    }
}
export const handleGetChannelPublicVideos = async (req, res) => {
    try {
        const { channelId } = req.params

        const videos = await prisma.video.findMany({
            where: {
                channelId: Number(channelId),
                status: "UPLOADED",
                visibility: "PUBLIC"
            },
            include: {
                aiData: true
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // ✅ FIX HERE
        const formatted = videos.map(v => ({
            id: v.id,
            title: v.title,
            aiTitle: v.aiData?.aiTitle ?? null,
            thumbnailKey: v.thumbnailKey,
            size: v.size.toString(), // 🔥 IMPORTANT
            createdAt: v.createdAt
        }))

        res.json({
            success: true,
            data: formatted
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ success: false })
    }
}
export const handleGetChannelPrivateVideos = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { channelId } = req.params

        // ✅ ensure user owns this channel
        const channel = await prisma.channel.findUnique({
            where: { id: Number(channelId) }
        })

        if (!channel || channel.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            })
        }

        const videos = await prisma.video.findMany({
            where: {
                channelId: Number(channelId),
                status: "UPLOADED",
                visibility: "PRIVATE"
            },
            include: {
                aiData: true
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        const formatted = videos.map(v => ({
            id: v.id,
            title: v.title,
            aiTitle: v.aiData?.aiTitle ?? null,
            thumbnailKey: v.thumbnailKey,
            size: v.size.toString(), // ✅ fix
            createdAt: v.createdAt
        }))

        return res.json({
            success: true,
            data: formatted
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false })
    }
}