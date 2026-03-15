import { Router } from "express"
import { authenticate } from "../../middlewares/auth.middleware"

import {
    handleReaction,
    handleComment,
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

router.post("/comment", authenticate, handleComment)

router.post("/playlist", authenticate, handleAddToPlaylist)

router.get("/video/:videoId", authenticate, handleGetVideoActions)

router.get("/playlists", authenticate, handleGetPlaylists)

router.post("/playlists", authenticate, handleCreatePlaylist)

router.get("/favorites", authenticate, handleGetFavouriteVideos)

router.get("/playlists-with-videos", authenticate, handleGetUserPlaylistsWithVideos)

router.get("/activity", authenticate, handleGetUserActivity)

export default router