import { Router } from "express"
import { authenticate, AuthRequest } from "../../middlewares/auth.middleware"
import { prisma } from "../../config/prisma"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getSignedUrl as getCFSignedUrl } from "@aws-sdk/cloudfront-signer"
import { s3 } from "../../config/s3"

const router = Router()

const signCloudFrontUrl = (key: string) => {
    const encodedKey = encodeURI(key)

    const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${encodedKey}`

    return getCFSignedUrl({
        url,
        keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
        privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        dateLessThan: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
}

router.get("/me", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { channel: true }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const [videosCount, playlistsCount, favoritesCount, commentsCount] =
            await Promise.all([
                prisma.video.count({
                    where: { channelId: user.channel?.id }
                }),
                prisma.playlist.count({
                    where: { userId: user.id }
                }),
                prisma.videoAction.count({
                    where: { userId: user.id, actionType: "LIKE" }
                }),
                prisma.videoAction.count({
                    where: { userId: user.id, actionType: "COMMENT" }
                })
            ])

        const uploadedVideos = await prisma.video.findMany({
            where: {
                channelId: user.channel?.id,
                status: "UPLOADED"
            },
            include: { aiData: true },
            orderBy: { createdAt: "desc" },
            take: 12
        })

        const historyActions = await prisma.videoAction.findMany({
            where: {
                userId: user.id,
                actionType: { in: ["LIKE", "COMMENT"] }
            },
            include: {
                video: {
                    include: { aiData: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 12
        })

        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    avatarKey: user.avatarKey,
                    avatarUrl: user.avatarKey
                        ? user.avatarKey.startsWith("http")
                            ? user.avatarKey
                            : signCloudFrontUrl(user.avatarKey)
                        : null,
                    provider: user.provider,
                    createdAt: user.createdAt
                },
                channel: user.channel,
                stats: {
                    videos: videosCount,
                    playlists: playlistsCount,
                    favorites: favoritesCount,
                    comments: commentsCount
                },
                uploadedVideos: uploadedVideos.map((video) => ({
                    id: video.id,
                    title: video.title,
                    aiTitle: video.aiData?.aiTitle ?? null,
                    thumbnailKey: video.thumbnailKey,
                    size: Number(video.size),
                    createdAt: video.createdAt
                })),
                history: historyActions.map((h) => ({
                    id: h.video.id,
                    title: h.video.title,
                    aiTitle: h.video.aiData?.aiTitle ?? null,
                    thumbnailKey: h.video.thumbnailKey
                }))
            }
        })
    } catch (error) {
        console.error("Profile API Error:", error)

        return res.status(500).json({
            success: false,
            message: "Server error"
        })
    }
})

router.patch("/profile", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { username, channelName, description } = req.body

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                username: username || undefined
            }
        })

        const channel = await prisma.channel.update({
            where: { userId: req.user.id },
            data: {
                name: channelName || undefined,
                description: description || undefined
            }
        })

        return res.json({
            success: true,
            data: { user, channel }
        })
    } catch (error) {
        console.error("Profile update error:", error)

        return res.status(500).json({
            success: false,
            message: "Profile update failed"
        })
    }
})

router.post("/avatar-upload-url", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { fileType } = req.body

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

        const ext = fileType.split("/")[1]

        const key = `${user.channel.username}/avatar/avatar_${Date.now()}.${ext}`

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET!,
            Key: key,
            ContentType: fileType
        })

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 60 * 5
        })

        return res.json({
            success: true,
            uploadUrl,
            key
        })
    } catch (error) {
        console.error("Avatar upload url error:", error)

        return res.status(500).json({
            success: false,
            message: "Failed to generate upload URL"
        })
    }
})

router.post("/avatar", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }

        const { key } = req.body

        await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarKey: key }
        })

        const avatarUrl = signCloudFrontUrl(key)

        return res.json({
            success: true,
            avatarUrl
        })
    } catch (error) {
        console.error("Avatar save error:", error)

        return res.status(500).json({
            success: false,
            message: "Failed to save avatar"
        })
    }
})

export default router