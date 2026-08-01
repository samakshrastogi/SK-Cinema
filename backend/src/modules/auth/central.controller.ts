import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { buildLoginSessionMeta, createUniqueUsername } from "./auth.utils";

type CentralPayload = {
    iss: string;
    aud: string;
    sub: string;
    email: string;
    name: string;
    role?: string;
    exp: number;
};

const CENTRAL_API_URL = (process.env.SK_CENTRAL_API_URL || "https://www.sk-hub.in/api").replace(/\/$/, "");
const JWT_SECRET = process.env.JWT_SECRET as string;

const isValidPayload = (value: unknown): value is CentralPayload => {
    if (!value || typeof value !== "object") return false;
    const payload = value as Partial<CentralPayload>;
    return payload.iss === "sk-central" && payload.aud === "sk-mediaflow" &&
        typeof payload.sub === "string" && typeof payload.email === "string" &&
        typeof payload.name === "string" && typeof payload.exp === "number" &&
        payload.exp > Math.floor(Date.now() / 1000);
};

const verifyCentralToken = async (token: string): Promise<CentralPayload | null> => {
    const secret = process.env.SK_CENTRAL_SSO_SECRET?.trim();
    if (secret) {
        try {
            const payload = jwt.verify(token, secret, { issuer: "sk-central", audience: "sk-mediaflow" });
            if (isValidPayload(payload)) return payload;
        } catch {
            // Fall back to Central validation during a deployment secret mismatch.
        }
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(`${CENTRAL_API_URL}/auth/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ token }),
                signal: controller.signal,
            });
            if (!response.ok) return null;
            const result = await response.json() as { data?: { valid?: boolean; payload?: unknown } };
            return result.data?.valid && isValidPayload(result.data.payload) ? result.data.payload : null;
        } catch {
            if (attempt === 1) return null;
        } finally {
            clearTimeout(timeout);
        }
    }
    return null;
};

export const centralLogin = async (req: Request, res: Response) => {
    try {
        const token = typeof req.body?.token === "string" ? req.body.token : "";
        const payload = token ? await verifyCentralToken(token) : null;
        if (!payload) return res.status(401).json({ success: false, message: "SK Central session expired or invalid" });

        const email = payload.email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.deletedAt || existing?.deactivatedAt) {
            return res.status(403).json({ success: false, message: "This account is not available" });
        }

        const user = existing
            ? await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name: payload.name || existing.name,
                    isVerified: true,
                    platformAdmin: payload.role === "admin" ? true : existing.platformAdmin,
                },
            })
            : await prisma.user.create({
                data: {
                    email,
                    name: payload.name,
                    username: await createUniqueUsername(email),
                    isVerified: true,
                    platformAdmin: payload.role === "admin",
                    provider: "LOCAL",
                },
            });

        const meta = buildLoginSessionMeta(req);
        const loginRecord = await prisma.userLogin.create({
            data: {
                userId: user.id,
                method: "LOCAL",
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                deviceLabel: meta.deviceLabel,
            },
        });
        const appToken = jwt.sign(
            { sub: user.id, email: user.email, loginId: loginRecord.id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            success: true,
            data: {
                token: appToken,
                loginId: loginRecord.id,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    avatarKey: user.avatarKey,
                    platformAdmin: user.platformAdmin,
                },
            },
        });
    } catch (error: any) {
        const detail = String(error?.message || "");
        const databaseUnavailable = /AuthenticationFailed|SCRAM|ConnectorError|query execution|database/i.test(detail);
        console.error("Central login failed", databaseUnavailable ? { category: "database_unavailable" } : error);
        return res.status(databaseUnavailable ? 503 : 500).json({
            success: false,
            message: databaseUnavailable
                ? "MediaFlow database connection is unavailable. Verify the MongoDB credentials and try again."
                : "MediaFlow sign-in could not be completed. Please try again.",
        });
    }
};
