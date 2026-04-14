import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import nodemailer from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"
import { prisma } from "../../config/prisma"
const EMAIL_FROM = process.env.EMAIL_FROM as string
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO as string
const JWT_SECRET = process.env.JWT_SECRET as string
const CLIENT_URL = process.env.CLIENT_URL
if (!JWT_SECRET) throw new Error("JWT_SECRET not defined")
const BREVO_USER = process.env.BREVO_USER as string
const BREVO_PASS = process.env.BREVO_PASS as string

if (!BREVO_USER || !BREVO_PASS)
    throw new Error("Brevo SMTP credentials missing")


const SALT_ROUNDS = 12
const OTP_EXPIRY_MINUTES = 10

class AuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
        super(message)
        this.statusCode = statusCode
    }
}

/* ---------------- EMAIL TRANSPORT ---------------- */

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 2525,
    secure: false,
    auth: {
        user: BREVO_USER,
        pass: BREVO_PASS,
    },
    requireTLS: true,
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    family: 4,
    tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
    },
    debug: true,
    logger: true,
} as SMTPTransport.Options)
transporter.on("error", console.error)

transporter.verify((err, success) => {
    if (err) {
        console.error("❌ SMTP ERROR:", err)
    } else {
        console.log("✅ SMTP READY")
    }
})

/* ---------------- EMAIL TEMPLATE ---------------- */

const renderEmailLayout = (
    title: string,
    body: string,
    button?: { text: string; link: string }
) => {
    const buttonHTML = button
        ? `
      <tr>
        <td align="center" style="padding-top:24px;">
          <a href="${button.link}" target="_blank"
          style="background:#2563eb;color:#fff;text-decoration:none;
          padding:12px 28px;border-radius:8px;font-weight:600;
          font-size:14px;display:inline-block;">
            ${button.text}
          </a>
        </td>
      </tr>`
        : ""

    return `
  <table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f3f6fb;padding:40px 10px;
  font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
  <tr>
  <td align="center">

  <table width="100%" cellpadding="0" cellspacing="0"
  style="max-width:560px;background:#fff;border-radius:16px;
  overflow:hidden;border:1px solid #e6e8ef;
  box-shadow:0 12px 30px rgba(0,0,0,0.08);">

  <tr>
  <td style="background:#2563eb;padding:22px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">
  🎬 SK Cinema
  </span>
  </td>
  </tr>

  <tr>
  <td style="padding:40px 36px;text-align:center;color:#1f2937;">

  <h2 style="margin-top:0;font-size:22px;font-weight:600;">
  ${title}
  </h2>

  ${body}

  ${buttonHTML}

  <p style="margin-top:30px;font-size:13px;color:#9ca3af;">
  For security reasons, never share this email with anyone.<br/>
  If you didn’t request this email, you can safely ignore it.
  </p>

  </td>
  </tr>

  <tr>
  <td style="background:#fafafa;padding:18px;text-align:center;
  border-top:1px solid #eee;font-size:12px;color:#9ca3af;">
  © ${new Date().getFullYear()} SK Cinema. All rights reserved.
  </td>
  </tr>

  </table>
  </td>
  </tr>
  </table>`
}

/* ---------------- UTILITIES ---------------- */

const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString()

/* ---------------- EMAIL SENDERS ---------------- */

const sendOTPEmail = async (email: string, otp: string) => {
    const body = `
  <p style="font-size:15px;color:#6b7280;">
  Enter the verification code below to verify your SK Cinema account.
  </p>

  <div style="margin:32px auto;font-size:40px;font-weight:700;
  letter-spacing:12px;color:#111827;background:#f8fafc;
  border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;
  max-width:300px;">
  ${otp}
  </div>

  <p style="font-size:14px;color:#6b7280;">
  This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
  </p>
  `

    await transporter.sendMail({
        from: `"SK Cinema Team" <${EMAIL_FROM}>`,
        replyTo: `"SK Cinema Support" <${EMAIL_REPLY_TO}>`,
        to: email,
        subject: "Welcome to SK Cinema 🎬 – Verify Your Email",
        html: renderEmailLayout("Verify your account", body, {
            text: "Open SK Cinema",
            link: CLIENT_URL,
        }),
    })
}

const sendResetEmail = async (email: string, resetLink: string) => {
    const body = `
  <p style="font-size:15px;color:#6b7280;">
  Click the button below to reset your password.
  </p>

  <p style="font-size:14px;color:#6b7280;">
  This reset link expires in <strong>1 hour</strong>.
  </p>
  `

    await transporter.sendMail({
        from: `"SK Cinema" <${BREVO_USER}>`,
        to: email,
        subject: "Reset your SK Cinema password",
        html: renderEmailLayout("Reset your password", body, {
            text: "Reset Password",
            link: resetLink,
        }),
    })
}

/* ---------------- AUTH SERVICES ---------------- */

export const registerUser = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
) => {
    if (!name || !email || !password || !confirmPassword)
        throw new AuthError("All fields are required")

    if (password !== confirmPassword)
        throw new AuthError("Passwords do not match")

    if (password.length < 6)
        throw new AuthError("Password must be at least 6 characters")

    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) throw new AuthError("Email already registered", 409)

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const otp = generateOTP()

    const username = email.split("@")[0]

    await prisma.user.create({
        data: {
            name,
            email,
            username,
            password: hashedPassword,
            provider: "LOCAL",
            otp,
            otpExpiry: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        },
    })

    const response = { message: "OTP sent to your email." }

    sendOTPEmail(email, otp).catch((err) => {
        console.error("Email failed:", err)
    })

    return response
}

export const verifyOTP = async (email: string, otp: string) => {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) throw new AuthError("User not found", 404)
    if (user.isVerified) throw new AuthError("Account already verified")

    if (!user.otp || !user.otpExpiry) throw new AuthError("Invalid OTP")
    if (user.otp !== otp) throw new AuthError("Incorrect OTP")
    if (user.otpExpiry < new Date()) throw new AuthError("OTP expired")

    await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, otp: null, otpExpiry: null },
    })

    return { message: "Account verified successfully" }
}

export const loginUser = async (
    email: string,
    password: string,
    remember = false
) => {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.provider !== "LOCAL")
        throw new AuthError("Invalid credentials", 401)

    if (!user.isVerified)
        throw new AuthError("Please verify your email first", 403)

    const match = await bcrypt.compare(password, user.password!)

    if (!match) throw new AuthError("Invalid credentials", 401)

    const token = jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: remember ? "30d" : "1d" }
    )

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            avatarKey: user.avatarKey,
            platformAdmin: user.platformAdmin
        },
    }
}

export const generateResetToken = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) throw new AuthError("User not found", 404)

    const resetToken = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExp: expiry },
    })

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`

    const response = { message: "Reset instructions sent to your email" }

    sendResetEmail(email, resetLink).catch(err => {
        console.error("Reset email failed:", err)
    })

    return response
}

export const resetPassword = async (token: string, newPassword: string) => {
    const user = await prisma.user.findFirst({
        where: { resetToken: token },
    })

    if (!user || !user.resetTokenExp)
        throw new AuthError("Invalid or expired reset token")

    if (new Date(user.resetTokenExp).getTime() <= Date.now())
        throw new AuthError("Reset token expired")

    if (!newPassword || newPassword.length < 6)
        throw new AuthError("Password must be at least 6 characters")

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null, resetTokenExp: null },
    })

    return { message: "Password reset successful" }
}
