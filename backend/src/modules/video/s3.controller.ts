import { Request, Response } from "express";
import {
    addUserBucket,
    scanUserBucket,
    importVideoFromUserBucket,
    listUserBuckets,
} from "./s3.service";

export const addBucket = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const {
            name,
            accessKey,
            secretKey,
            region,
            bucketName,
            endpoint,
        } = req.body;

        if (!name || !accessKey || !secretKey || !bucketName) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        const result = await addUserBucket(
            userId,
            name,
            accessKey,
            secretKey,
            region || null,
            bucketName,
            endpoint || null
        );

        res.json(result);
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Failed to add bucket",
        });
    }
};

export const scanBucket = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        if (!id) {
            return res.status(400).json({
                message: "Credential ID required",
            });
        }

        const files = await scanUserBucket(
            Number(id),
            userId
        );

        res.json(files);
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Failed to scan bucket",
        });
    }
};

export const importVideo = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const { credentialId, sourceKey } = req.body;

        if (!credentialId || !sourceKey) {
            return res.status(400).json({
                message: "credentialId and sourceKey are required",
            });
        }

        const newKey = await importVideoFromUserBucket(
            Number(credentialId),
            userId,
            sourceKey
        );

        res.json({ key: newKey });
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Import failed",
        });
    }
};

export const listBuckets = async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const buckets = await listUserBuckets(userId);

        res.json(buckets);
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Failed to list buckets",
        });
    }
};