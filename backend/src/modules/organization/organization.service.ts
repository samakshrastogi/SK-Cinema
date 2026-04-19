// @ts-nocheck
import { prisma } from "../../config/prisma"

export interface OrgAccessContext {
    activeOrganizationId: string | null
    membershipRole: "ADMIN" | "MEMBER" | null
    canSeePublic: boolean
    canSeePrivate: boolean
    canSeeOrganization: boolean
    canUpload: boolean
    restrictToAdminUploads: boolean
    blockedReason?: string
}

const isOrganizationExpired = (org: {
    trialEndsAt: Date
    subscriptionEndsAt: Date | null
    blockedAt: Date | null
}) => {
    if (org.blockedAt) return true

    const now = Date.now()
    const trialActive = new Date(org.trialEndsAt).getTime() >= now
    const subscriptionActive = org.subscriptionEndsAt
        ? new Date(org.subscriptionEndsAt).getTime() >= now
        : false

    return !(trialActive || subscriptionActive)
}

export const getOrganizationAccessContext = async (
    userId: string
): Promise<OrgAccessContext> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            activeOrganization: {
                include: {
                    members: {
                        where: {
                            userId,
                            status: "APPROVED"
                        },
                        select: {
                            id: true,
                            role: true
                        }
                    },
                    allowedUploaders: {
                        where: { userId },
                        select: { id: true }
                    }
                }
            }
        }
    })

    const org = user?.activeOrganization
    const membership = org?.members?.[0]

    if (!org || !membership) {
        return {
            activeOrganizationId: null,
            membershipRole: null,
            canSeePublic: true,
            canSeePrivate: false,
            canSeeOrganization: false,
            canUpload: true,
            restrictToAdminUploads: false
        }
    }

    if (isOrganizationExpired(org)) {
        return {
            activeOrganizationId: org.id,
            membershipRole: membership.role as "ADMIN" | "MEMBER",
            canSeePublic: false,
            canSeePrivate: false,
            canSeeOrganization: false,
            canUpload: false,
            restrictToAdminUploads: true,
            blockedReason: "Organization trial/subscription expired"
        }
    }

    let canUpload = false
    if (org.uploadPolicy === "ALL_MEMBERS") {
        canUpload = true
    } else if (org.uploadPolicy === "ADMINS_ONLY") {
        canUpload = membership.role === "ADMIN"
    } else {
        canUpload =
            membership.role === "ADMIN" || (org.allowedUploaders?.length ?? 0) > 0
    }

    return {
        activeOrganizationId: org.id,
        membershipRole: membership.role as "ADMIN" | "MEMBER",
        canSeePublic: org.allowPublicContent,
        canSeePrivate: org.allowPrivateContent,
        canSeeOrganization: true,
        canUpload,
        restrictToAdminUploads: !org.allowPublicContent
    }
}

export const requireOrganizationAdmin = async (
    userId: string,
    organizationId: string
) => {
    const member = await prisma.organizationMembership.findUnique({
        where: {
            organizationId_userId: {
                organizationId,
                userId
            }
        }
    })

    if (!member || member.status !== "APPROVED" || member.role !== "ADMIN") {
        throw new Error("Admin access required")
    }

    return member
}

export const normalizeOrganizationSlug = (nameOrSlug: string) =>
    nameOrSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
