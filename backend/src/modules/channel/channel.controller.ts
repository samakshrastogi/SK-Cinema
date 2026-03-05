import { Response } from "express";
import {
    createChannel,
    getMyChannel,
} from "./channel.service";

export const handleCreateChannel = async (
    req: any,
    res: Response
) => {
    try {
        const { name, username, description } = req.body;

        if (!name || !username) {
            return res.status(400).json({
                message: "Channel name and username are required",
            });
        }

        const channel = await createChannel(
            req.user.id,
            name,
            username,
            description
        );

        res.status(201).json(channel);
    } catch (error: any) {
        console.error("Create channel error:", error);

        res.status(400).json({
            message: error.message || "Failed to create channel",
        });
    }
};

export const handleGetMyChannel = async (
    req: any,
    res: Response
) => {
    try {
        const channel = await getMyChannel(req.user.id);

        if (!channel) {
            return res.status(200).json(null);
        }

        res.json(channel);
    } catch (error) {
        console.error("Get channel error:", error);
        res.status(500).json({
            message: "Failed to fetch channel",
        });
    }
};