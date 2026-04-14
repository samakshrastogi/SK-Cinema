import { prisma } from "../../config/prisma"

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24)

export const generateUniqueChannelUsername = async (seed: string) => {
    const base = slugify(seed) || `channel-${Date.now()}`
    let candidate = base
    let count = 0

    while (true) {
        const exists = await prisma.channel.findUnique({
            where: { username: candidate }
        })

        if (!exists) return candidate

        count += 1
        candidate = `${base}-${count}`.slice(0, 30)
    }
}

export const createChannel = async (
    userId: number,
    name: string,
    username?: string,
    description?: string
) => {
    if (!userId) {
        throw new Error("Invalid user")
    }

    if (!name?.trim()) {
        throw new Error("Channel name is required")
    }

    const existingChannel = await prisma.channel.findUnique({
        where: { userId }
    })

    if (existingChannel) {
        throw new Error("You already have a channel")
    }

    const normalizedUsername = username?.trim().toLowerCase()
    const finalUsername = normalizedUsername
        ? await generateUniqueChannelUsername(normalizedUsername)
        : await generateUniqueChannelUsername(name)

    return prisma.channel.create({
        data: {
            name: name.trim(),
            username: finalUsername,
            description: description?.trim(),
            userId
        },
        select: {
            id: true,
            name: true,
            username: true,
            description: true,
            createdAt: true
        }
    })
}

export const getMyChannel = async (userId: number) => {
    if (!userId) {
        throw new Error("Invalid user")
    }

    return prisma.channel.findUnique({
        where: { userId },
        select: {
            id: true,
            name: true,
            username: true,
            description: true,
            createdAt: true
        }
    })
}
