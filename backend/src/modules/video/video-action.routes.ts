import { Router } from "express"
import { authenticate } from "../../middlewares/auth.middleware"

import {
    handleRecordView,
    handleWatchProgress,
    handleReaction,
    handleComment,
    handleShare,
    handleToggleSubscribe,
    handleAddToPlaylist,
    handleGetVideoActions,
    handleGetPlaylists,
    handleCreatePlaylist,
    handleGetFavouriteVideos,
    handleGetUserPlaylistsWithVideos,
    handleGetUserActivity
} from "./video-action.controller"

const router = Router()

router.post("/react", authenticate, handleReaction)
router.post("/view", authenticate, handleRecordView)
router.post("/watch-progress", authenticate, handleWatchProgress)

router.post("/comment", authenticate, handleComment)
router.post("/share", authenticate, handleShare)
router.post("/subscribe", authenticate, handleToggleSubscribe)

router.post("/playlist", authenticate, handleAddToPlaylist)

router.get("/video/:publicId", authenticate, handleGetVideoActions)

router.get("/playlists", authenticate, handleGetPlaylists)

router.post("/playlists", authenticate, handleCreatePlaylist)

router.get("/favorites", authenticate, handleGetFavouriteVideos)

router.get("/playlists-with-videos", authenticate, handleGetUserPlaylistsWithVideos)

router.get("/activity", authenticate, handleGetUserActivity)

export default router
