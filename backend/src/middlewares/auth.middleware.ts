import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../config/prisma"

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not defined")
}

export interface AuthRequest extends Request {
    user?: {
        id: number
        email: string
    }
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        })
    }

    const [scheme, token] = authHeader.split(" ")

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
            sub: number
            email: string
        }

        req.user = {
            id: decoded.sub,
            email: decoded.email
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { isVerified: true }
        })

        if (!user?.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Account is not verified"
            })
        }

        next()
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })
    }
}
