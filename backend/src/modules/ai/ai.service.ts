import { prisma } from "../../config/prisma";

export const generateMetadataService = async (videoId: number) => {
    const videoAI = await prisma.videoAI.findUnique({
        where: { videoId },
    });

    if (!videoAI) {
        throw new Error("AI metadata not found");
    }

    return {
        title: videoAI.aiTitle,
        description: videoAI.aiDescription,
        keywords: videoAI.keywords,
        tags: videoAI.tags,
    };
};

export const applyAISuggestionService = async (videoId: number) => {
    const videoAI = await prisma.videoAI.findUnique({
        where: { videoId },
    });

    if (!videoAI) {
        throw new Error("AI metadata not found");
    }

    const video = await prisma.video.update({
        where: { id: videoId },
        data: {
            title: videoAI.aiTitle || undefined,
            description: videoAI.aiDescription || undefined,
        },
    });

    return video;
};