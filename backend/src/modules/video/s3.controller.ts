import { Request, Response } from "express";
import {
    addUserBucket,
    scanUserBucket,
    importVideoFromUserBucket,
    listUserBuckets,
} from "./s3.service";

/* =============================
   1️⃣ Add Bucket
============================= */

export const addBucket = async (req: any, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
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
            req.user.id,
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

/* =============================
   2️⃣ Scan Bucket
============================= */

export const scanBucket = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: "Credential ID required",
            });
        }

        const files = await scanUserBucket(
            Number(id),
            req.userId
        );

        res.json(files);
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Failed to scan bucket",
        });
    }
};

/* =============================
   3️⃣ Import Video
============================= */

export const importVideo = async (req: any, res: Response) => {
    try {
        const { credentialId, sourceKey } = req.body;

        if (!credentialId || !sourceKey) {
            return res.status(400).json({
                message: "credentialId and sourceKey are required",
            });
        }

        const newKey = await importVideoFromUserBucket(
            Number(credentialId),
            req.userId,
            sourceKey
        );

        res.json({ key: newKey });
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Import failed",
        });
    }
};

/* =============================
   4️⃣ List Buckets
============================= */

export const listBuckets = async (req: any, res: Response) => {
    try {
        const buckets = await listUserBuckets(req.userId);
        res.json(buckets);
    } catch (error: any) {
        res.status(400).json({
            message: error?.message || "Failed to list buckets",
        });
    }
};