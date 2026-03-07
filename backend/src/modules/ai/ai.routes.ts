import { Router } from "express";
import {
    generateMetadataController,
    applyAISuggestionController,
} from "./ai.controller";

const router = Router();

router.get("/video/:videoId", generateMetadataController);
router.post("/video/:videoId/apply", applyAISuggestionController);

export default router;