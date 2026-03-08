import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";

import {
    getPresignedUrl,
    finishUpload,
    handleScanS3,
    importSelectedVideos,
    handleGetVideoById,
    handleGetVideos,
} from "./video.controller";

import {
    addBucket,
    scanBucket,
    importVideo,
    listBuckets,
} from "./s3.controller";

const router = Router();

router.post("/presign", authenticate, getPresignedUrl);
router.post("/complete", authenticate, finishUpload);

router.get("/scan", authenticate, handleScanS3);
router.post("/import", authenticate, importSelectedVideos);

router.post("/s3/add", authenticate, addBucket);
router.get("/s3/list", authenticate, listBuckets);
router.get("/s3/scan/:id", authenticate, scanBucket);
router.post("/s3/import", authenticate, importVideo);

router.get("/list", handleGetVideos);
router.get("/:id", handleGetVideoById);

export default router;