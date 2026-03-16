import { Router } from "express"
import { authenticate } from "../../middlewares/auth.middleware"
import {
    handleCreateChannel,
    handleGetMyChannel
} from "./channel.controller"

const router = Router()

router.post("/", authenticate, handleCreateChannel)

router.get("/me", authenticate, handleGetMyChannel)

export default router