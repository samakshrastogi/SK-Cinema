import { Router } from "express";
import passport from "passport";
import {
    register,
    verifyEmailOTP,
    login,
    forgotPassword,
    resetUserPassword
} from "./auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyEmailOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetUserPassword);

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/login`
    }),
    (req: any, res) => {
        const token = req.user.token;
        res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
    }
);

export default router;