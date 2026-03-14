import { Router } from "express"
import { authenticate } from "../../middlewares/auth.middleware"

import {
    handleReaction,
    handleComment,
    handleAddToPlaylist,
    handleGetVideoActions,
    handleGetPlaylists,
    handleCreatePlaylist
} from "./video-action.controller"

const router = Router()

router.post("/react", authenticate, handleReaction)

router.post("/comment", authenticate, handleComment)

router.post("/playlist", authenticate, handleAddToPlaylist)

router.get("/video/:videoId", authenticate, handleGetVideoActions)

router.get("/playlists", authenticate, handleGetPlaylists)

router.post("/playlists", authenticate, handleCreatePlaylist)

export default router