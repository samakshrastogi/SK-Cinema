import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import videoRoutes from "./modules/video/video.routes";
import channelRoutes from "./modules/channel/channel.routes";
import aiRoutes from "./modules/ai/ai.routes";
import { prisma } from "./config/prisma";
import "./workers";

const app = express();

const JWT_SECRET = process.env.JWT_SECRET as string;

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());

app.use(
    session({
        secret: JWT_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0].value;

                if (!email) {
                    return done(new Error("No email"), false);
                }

                let user = await prisma.user.findUnique({
                    where: { email }
                });

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            username: email.split("@")[0],
                            password: ""
                        }
                    });

                    await prisma.channel.create({
                        data: {
                            name: user.username,
                            username: user.username,
                            userId: user.id
                        }
                    });
                }

                const token = jwt.sign(
                    { sub: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: "30d" }
                );

                return done(null, { token });
            } catch (err) {
                return done(err, false);
            }
        }
    )
);

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (_req, res) => {
    res.send("API is running...");
});

export default app;