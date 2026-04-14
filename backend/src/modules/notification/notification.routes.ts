import { Router } from "express"
import { authenticate, AuthRequest } from "../../middlewares/auth.middleware"
import { prisma } from "../../config/prisma"

const router = Router()

router.get("/", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" })

        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 100
        })

        const unreadCount = notifications.filter((n) => !n.isRead).length

        return res.json({
            success: true,
            data: notifications,
            unreadCount
        })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch notifications" })
    }
})

router.post("/:id/read", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" })

        const id = Number(req.params.id)
        if (!id) return res.status(400).json({ success: false, message: "Invalid id" })

        await prisma.notification.updateMany({
            where: { id, userId: req.user.id },
            data: { isRead: true }
        })

        return res.json({ success: true })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to mark notification as read" })
    }
})

router.post("/read-all", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" })

        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        })

        return res.json({ success: true })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to mark all notifications as read" })
    }
})

export default router

