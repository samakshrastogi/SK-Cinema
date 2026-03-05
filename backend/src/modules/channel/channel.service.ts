import { prisma } from "../../config/prisma";

export const createChannel = async (
    userId: number,
    name: string,
    username: string,
    description?: string
) => {
    if (!name || !username) {
        throw new Error("Channel name and username are required");
    }

    // Check if user already has a channel
    const existingChannel = await prisma.channel.findUnique({
        where: { userId },
    });

    if (existingChannel) {
        throw new Error("You already have a channel");
    }

    // Check if username is already taken
    const existingUsername = await prisma.channel.findUnique({
        where: { username },
    });

    if (existingUsername) {
        throw new Error("Channel username already taken");
    }

    return prisma.channel.create({
        data: {
            name,
            username,
            description,
            userId,
        },
    });
};

export const getMyChannel = async (userId: number) => {
    return prisma.channel.findUnique({
        where: { userId },
        select: {
            id: true,
            name: true,
            username: true,
            description: true,
            createdAt: true,
        },
    });
};