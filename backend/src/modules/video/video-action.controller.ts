import { Request, Response } from "express"
import { prisma } from "../../config/prisma"
import { AuthRequest } from "../../middlewares/auth.middleware"



export const handleReaction = async (req: AuthRequest, res: Response) => {
    try {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { videoId, type } = req.body

        const existing = await prisma.videoAction.findFirst({
            where: {
                userId: req.user.id,
                videoId: Number(videoId),
                actionType: { in: ["LIKE", "DISLIKE"] }
            }
        })

        if (existing) {

            if (existing.actionType === type) {

                await prisma.videoAction.delete({
                    where: { id: existing.id }
                })

                return res.json({ removed: true })
            }

            await prisma.videoAction.delete({
                where: { id: existing.id }
            })
        }

        const action = await prisma.videoAction.create({
            data: {
                userId: req.user.id,
                videoId: Number(videoId),
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

        const { videoId, text } = req.body

        const comment = await prisma.videoAction.create({
            data: {
                userId: req.user.id,
                videoId: Number(videoId),
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

        const { videoId, playlistId } = req.body

        const action = await prisma.videoAction.create({
            data: {
                userId: req.user.id,
                videoId: Number(videoId),
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

        const videoId = Number(req.params.videoId)

        const likes = await prisma.videoAction.count({
            where: { videoId, actionType: "LIKE" }
        })

        const dislikes = await prisma.videoAction.count({
            where: { videoId, actionType: "DISLIKE" }
        })

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