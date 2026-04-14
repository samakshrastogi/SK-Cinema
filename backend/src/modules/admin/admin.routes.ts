import { Router } from "express"
import { authenticate, AuthRequest } from "../../middlewares/auth.middleware"
import { prisma } from "../../config/prisma"

const router = Router()
const SUPER_ADMIN_EMAIL = "samakshrastogi885@gmail.com"

const requirePlatformAdmin = async (req: AuthRequest, res: any, next: any) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true, platformAdmin: true }
        })

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" })
        }

        if (user.email === SUPER_ADMIN_EMAIL || user.platformAdmin) {
            return next()
        }

        return res.status(403).json({ success: false, message: "Admin access required" })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to authorize" })
    }
}

router.get("/metrics", authenticate, requirePlatformAdmin, async (_req: AuthRequest, res) => {
    try {
        const [
            totalLogins,
            likesCount,
            dislikesCount,
            sharesCount,
            uniqueUsersRaw,
            avgSessionRaw,
            dailyLoginsRaw,
            subscriptionCounts,
            topOrgsRaw
        ] = await Promise.all([
            prisma.userLogin.count(),
            prisma.videoReaction.count({ where: { type: "LIKE" } }),
            prisma.videoReaction.count({ where: { type: "DISLIKE" } }),
            prisma.videoShare.count(),
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT "userId")::bigint AS count FROM "UserLogin"
            `,
            prisma.$queryRaw<{ avg: number | null }[]>`
                SELECT AVG("sessionLengthSec")::float AS avg FROM "UserLogin"
                WHERE "sessionLengthSec" IS NOT NULL
            `,
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT DATE("createdAt")::text AS day, COUNT(*)::bigint AS count
                FROM "UserLogin"
                GROUP BY DATE("createdAt")
                ORDER BY DATE("createdAt") ASC
            `,
            prisma.organization.groupBy({
                by: ["subscriptionPlan"],
                _count: { _all: true }
            }),
            prisma.$queryRaw<{
                id: number
                name: string
                shares: bigint
                likes: bigint
                views: bigint
            }[]>`
                SELECT o.id, o.name,
                    COALESCE(shares.count, 0) AS shares,
                    COALESCE(likes.count, 0) AS likes,
                    COALESCE(views.count, 0) AS views
                FROM "Organization" o
                LEFT JOIN (
                    SELECT v."organizationId" AS org_id, COUNT(*)::bigint AS count
                    FROM "VideoShare" vs
                    JOIN "Video" v ON v.id = vs."videoId"
                    WHERE v."organizationId" IS NOT NULL
                    GROUP BY v."organizationId"
                ) shares ON shares.org_id = o.id
                LEFT JOIN (
                    SELECT v."organizationId" AS org_id, COUNT(*)::bigint AS count
                    FROM "VideoReaction" vr
                    JOIN "Video" v ON v.id = vr."videoId"
                    WHERE v."organizationId" IS NOT NULL AND vr.type = 'LIKE'
                    GROUP BY v."organizationId"
                ) likes ON likes.org_id = o.id
                LEFT JOIN (
                    SELECT v."organizationId" AS org_id, COUNT(*)::bigint AS count
                    FROM "VideoView" vv
                    JOIN "Video" v ON v.id = vv."videoId"
                    WHERE v."organizationId" IS NOT NULL
                    GROUP BY v."organizationId"
                ) views ON views.org_id = o.id
                ORDER BY shares DESC, likes DESC, views DESC
                LIMIT 5
            `
        ])

        const uniqueUsers = Number(uniqueUsersRaw?.[0]?.count || 0)
        const avgSessionLength = avgSessionRaw?.[0]?.avg ?? 0

        return res.json({
            success: true,
            data: {
                cards: {
                    uniqueUsers,
                    totalLogins,
                    avgSessionLength,
                    likes: likesCount,
                    dislikes: dislikesCount,
                    shares: sharesCount
                },
                dailyLogins: dailyLoginsRaw.map((row) => ({
                    day: row.day,
                    count: Number(row.count || 0)
                })),
                topOrganizations: topOrgsRaw.map((row) => ({
                    id: row.id,
                    name: row.name,
                    shares: Number(row.shares || 0),
                    likes: Number(row.likes || 0),
                    views: Number(row.views || 0)
                })),
                subscriptionCounts: subscriptionCounts.map((row) => ({
                    plan: row.subscriptionPlan,
                    count: row._count._all
                }))
            }
        })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to load metrics" })
    }
})

router.post("/grant", authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" })

        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true }
        })

        if (!me || me.email !== SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ success: false, message: "Only super admin can grant access" })
        }

        const email = String(req.body?.email || "").trim().toLowerCase()
        if (!email) return res.status(400).json({ success: false, message: "email is required" })

        const updated = await prisma.user.update({
            where: { email },
            data: { platformAdmin: true }
        })

        return res.json({ success: true, data: { id: updated.id, email: updated.email } })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to grant access" })
    }
})

export default router
