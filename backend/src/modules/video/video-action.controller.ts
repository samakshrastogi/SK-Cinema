import { Response } from "express"
import { prisma } from "../../config/prisma"
import { AuthRequest } from "../../middlewares/auth.middleware"



export const handleReaction = async (req: AuthRequest, res: Response) => {
    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { publicId, type } = req.body

        const video = await prisma.video.findUnique({
            where: { publicId }
        })

        if (!video) {
            return res.status(404).json({ message: "Video not found" })
        }

        const vid = video.id
        const userId = req.user.id

        const existingReaction = await prisma.videoAction.findFirst({
            where: {
                userId,
                videoId: vid,
                actionType: { in: ["LIKE", "DISLIKE"] }
            }
        })

        if (existingReaction && existingReaction.actionType === type) {

            await prisma.videoAction.delete({
                where: { id: existingReaction.id }
            })

            return res.json({ removed: true })
        }

        if (existingReaction) {
            await prisma.videoAction.delete({
                where: { id: existingReaction.id }
            })
        }

        const action = await prisma.videoAction.create({
            data: {
                userId,
                videoId: vid,
                actionType: type
            }
        })

        res.json(action)

    } catch {
        res.status(500).json({ message: "Reaction failed" })
    }
}



export const handleComment = async (req: AuthRequest, res: Response) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { publicId, text } = req.body

        const video = await prisma.video.findUnique({
            where: { publicId }
        })

        if (!video) {
            return res.status(404).json({ message: "Video not found" })
        }
        const comment = await prisma.videoAction.create({
            data: {
                userId: req.user.id,
                videoId: video.id,
                actionType: "COMMENT",
                commentText: text
            }
        })

        res.json(comment)

    } catch {
        res.status(500).json({ message: "Comment failed" })
    }
}



export const handleAddToPlaylist = async (req: AuthRequest, res: Response) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { publicId, playlistId } = req.body

        const video = await prisma.video.findUnique({
            where: { publicId }
        })

        if (!video) {
            return res.status(404).json({ message: "Video not found" })
        }
        const action = await prisma.videoAction.create({
            data: {
                userId: req.user.id,
                videoId: video.id,
                playlistId: Number(playlistId),
                actionType: "ADD_TO_PLAYLIST"
            }
        })

        res.json(action)

    } catch {
        res.status(500).json({ message: "Playlist action failed" })
    }
}



export const handleGetPlaylists = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const playlists = await prisma.playlist.findMany({
            where: {
                userId: req.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        res.json(playlists)

    } catch {
        res.status(500).json({ message: "Failed to fetch playlists" })
    }
}



export const handleCreatePlaylist = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { name } = req.body

        const playlist = await prisma.playlist.create({
            data: {
                name,
                userId: req.user.id
            }
        })

        res.json(playlist)

    } catch {
        res.status(500).json({ message: "Failed to create playlist" })
    }
}



export const handleGetVideoActions = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        const publicId = req.params.publicId

        const video = await prisma.video.findUnique({
            where: { publicId }
        })

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            })
        }

        const videoId = video.id
        const [likes, dislikes] = await Promise.all([
            prisma.videoAction.count({
                where: { videoId, actionType: "LIKE" }
            }),
            prisma.videoAction.count({
                where: { videoId, actionType: "DISLIKE" }
            })
        ])

        const commentsRaw = await prisma.videoAction.findMany({
            where: { videoId, actionType: "COMMENT" },
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        const comments = commentsRaw.map((c) => ({
            id: c.id,
            commentText: c.commentText,
            username: c.user.username,
            createdAt: c.createdAt
        }))

        let userReaction: "LIKE" | "DISLIKE" | null = null

        if (req.user) {

            const reaction = await prisma.videoAction.findFirst({
                where: {
                    videoId,
                    userId: req.user.id,
                    actionType: { in: ["LIKE", "DISLIKE"] }
                }
            })

            if (reaction) {
                userReaction = reaction.actionType as "LIKE" | "DISLIKE"
            }
        }

        res.json({
            likes,
            dislikes,
            comments,
            userReaction
        })

    } catch {
        res.status(500).json({ message: "Fetch failed" })
    }
}

export const handleGetFavouriteVideos = async (
    req: AuthRequest,
    res: Response
) => {
    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const likes = await prisma.videoAction.findMany({
            where: {
                userId: req.user.id,
                actionType: "LIKE"
            },
            include: {
                video: {
                    include: {
                        aiData: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        const videos = likes
            .map((l) => l.video)
            .filter((v) => v !== null)
            .map((video) => ({
                publicId: video.publicId,
                title: video.title,
                aiTitle: video.aiData?.aiTitle ?? null,
                thumbnailKey: video.thumbnailKey,
                size: Number(video.size),
                createdAt: video.createdAt
            }))

        res.json(videos)

    } catch (error) {

        console.error("🔥 Favourite API Error:", error)

        res.status(500).json({
            message: "Failed to fetch favourite videos"
        })
    }
}


export const handleGetUserPlaylistsWithVideos = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const playlists = await prisma.playlist.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                actions: {
                    where: {
                        actionType: "ADD_TO_PLAYLIST"
                    },
                    include: {
                        video: {
                            include: {
                                aiData: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        const formatted = playlists.map((playlist) => ({

            id: playlist.id,
            name: playlist.name,
            createdAt: playlist.createdAt,

            videos: playlist.actions
                .map((action) => action.video)
                .filter((v) => v !== null)
                .map((video) => ({
                    publicId: video.publicId,
                    title: video.title,
                    aiTitle: video.aiData?.aiTitle ?? null,
                    thumbnailKey: video.thumbnailKey,
                    size: Number(video.size),
                    createdAt: video.createdAt
                }))

        }))

        res.json(formatted)

    } catch (error) {

        console.error("🔥 Playlist API Error:", error)

        res.status(500).json({
            message: "Failed to fetch playlists"
        })

    }

}

export const handleGetUserActivity = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const actions = await prisma.videoAction.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                video: {
                    include: {
                        aiData: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        })

        const activity = actions
            .filter((a) => a.video !== null)
            .map((a) => {

                let type = ""
                let title = a.video?.title || "Video"

                if (a.actionType === "LIKE") {
                    type = "Liked"
                }

                if (a.actionType === "COMMENT") {
                    type = "Commented"
                }

                if (a.actionType === "ADD_TO_PLAYLIST") {
                    type = "Added to Playlist"
                }

                return {
                    type,
                    title,
                    createdAt: a.createdAt
                }

            })

        res.json(activity)

    } catch (error) {

        console.error("🔥 Activity API Error:", error)

        res.status(500).json({
            message: "Failed to fetch activity"
        })

    }

}