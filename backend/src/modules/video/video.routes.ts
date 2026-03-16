import { Router } from "express"
import { authenticate } from "../../middlewares/auth.middleware"

import {
    getPresignedUrl,
    finishUpload,
    handleScanS3,
    importSelectedVideos,
    handleGetVideoById,
    handleGetVideos,
    handleGetAIInsights
} from "./video.controller"

import {
    addBucket,
    scanBucket,
    importVideo,
    listBuckets
} from "./s3.controller"

const router = Router()

router.post("/upload/presign", authenticate, getPresignedUrl)
router.post("/upload/complete", authenticate, finishUpload)

router.get("/scan", authenticate, handleScanS3)
router.post("/import", authenticate, importSelectedVideos)

router.post("/s3/buckets", authenticate, addBucket)
router.get("/s3/buckets", authenticate, listBuckets)
router.get("/s3/buckets/:id/scan", authenticate, scanBucket)
router.post("/s3/import", authenticate, importVideo)

router.get("/ai-insights", authenticate, handleGetAIInsights)

router.get("/", handleGetVideos)
router.get("/:id", handleGetVideoById)

export default router