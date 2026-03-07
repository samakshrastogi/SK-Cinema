import { Request, Response } from "express";
import {
    generateMetadataService,
    applyAISuggestionService,
} from "./ai.service";

export const generateMetadataController = async (
    req: Request,
    res: Response
) => {
    try {
        const videoId = Number(req.params.videoId);

        if (!videoId) {
            return res.status(400).json({
                message: "videoId is required",
            });
        }

        const result = await generateMetadataService(videoId);

        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({
            message: error?.message || "AI generation failed",
        });
    }
};

export const applyAISuggestionController = async (
    req: Request,
    res: Response
) => {
    try {
        const videoId = Number(req.params.videoId);

        if (!videoId) {
            return res.status(400).json({
                message: "videoId is required",
            });
        }

        const result = await applyAISuggestionService(videoId);

        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({
            message: error?.message || "Failed to apply AI suggestion",
        });
    }
};