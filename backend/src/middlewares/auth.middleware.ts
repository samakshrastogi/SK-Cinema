import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

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

export const authenticate = (
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

        next()
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })
    }
}