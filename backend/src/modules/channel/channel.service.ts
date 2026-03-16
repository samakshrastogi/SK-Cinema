import { prisma } from "../../config/prisma"

export const createChannel = async (
    userId: number,
    name: string,
    username: string,
    description?: string
) => {
    if (!userId) {
        throw new Error("Invalid user")
    }

    if (!name || !username) {
        throw new Error("Channel name and username are required")
    }

    const normalizedUsername = username.trim().toLowerCase()

    const existingChannel = await prisma.channel.findUnique({
        where: { userId }
    })

    if (existingChannel) {
        throw new Error("You already have a channel")
    }

    const existingUsername = await prisma.channel.findUnique({
        where: { username: normalizedUsername }
    })

    if (existingUsername) {
        throw new Error("Channel username already taken")
    }

    return prisma.channel.create({
        data: {
            name: name.trim(),
            username: normalizedUsername,
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