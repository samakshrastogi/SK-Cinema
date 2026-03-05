import { Request, Response } from "express";
import { generateMetadataService } from "./ai.service";

export const generateMetadataController = async (
    req: Request,
    res: Response
) => {
    try {
        const { filename } = req.body;

        if (!filename) {
            return res.status(400).json({ message: "Filename is required" });
        }

        const result = await generateMetadataService(filename);

        return res.json(result);
    } catch (error) {
        return res.status(500).json({ message: "AI generation failed" });
    }
};