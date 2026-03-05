import { Router } from "express";
import { generateMetadataController } from "./ai.controller";

const router = Router();

router.post("/generate-metadata", generateMetadataController);

export default router;