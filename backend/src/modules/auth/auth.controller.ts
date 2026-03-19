import { Request, Response } from "express"
import {
    registerUser,
    verifyOTP,
    loginUser,
    generateResetToken,
    resetPassword,
} from "./auth.service"

const handleError = (res: Response, error: any) => {
    const status = error.statusCode || 500
    const message = error.message || "Internal server error"

    return res.status(status).json({
        success: false,
        message,
    })
}

/* ---------------- REGISTER ---------------- */

export const register = async (req: Request, res: Response) => {
    try {

        const { name, email, password, confirmPassword } = req.body

        const result = await registerUser(
            name,
            email,
            password,
            confirmPassword
        )

        return res.status(201).json({
            success: true,
            message: result.message,
        })

    } catch (error: any) {

        return handleError(res, error)

    }
}

/* ---------------- VERIFY OTP ---------------- */

export const verifyEmailOTP = async (
    req: Request,
    res: Response
) => {

    try {

        const { email, otp } = req.body

        const result = await verifyOTP(email, otp)

        return res.status(200).json({
            success: true,
            message: result.message,
        })

    } catch (error: any) {

        return handleError(res, error)

    }

}

/* ---------------- LOGIN ---------------- */

export const login = async (req: Request, res: Response) => {

    try {

        const { email, password, remember } = req.body

        const result = await loginUser(email, password, remember)

        return res.status(200).json({
            success: true,
            data: result,
        })

    } catch (error: any) {

        return handleError(res, error)

    }

}

/* ---------------- FORGOT PASSWORD ---------------- */

export const forgotPassword = async (
    req: Request,
    res: Response
) => {

    try {

        const { email } = req.body

        const result = await generateResetToken(email)

        return res.status(200).json({
            success: true,
            message: "Reset instructions sent to your email",
            data: result,
        })

    } catch (error: any) {

        return handleError(res, error)

    }

}

/* ---------------- RESET PASSWORD ---------------- */

export const resetUserPassword = async (
    req: Request,
    res: Response
) => {

    try {

        const { token, newPassword } = req.body

        const result = await resetPassword(token, newPassword)

        return res.status(200).json({
            success: true,
            message: result.message,
        })

    } catch (error: any) {

        return handleError(res, error)

    }

}