import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "../../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET as string;
const EMAIL_USER = process.env.EMAIL_USER as string;
const EMAIL_PASS = process.env.EMAIL_PASS as string;

if (!JWT_SECRET) throw new Error("JWT_SECRET not defined");
if (!EMAIL_USER || !EMAIL_PASS)
    throw new Error("Email credentials missing in .env");

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;

class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email: string, otp: string) => {
    await transporter.sendMail({
        from: `"SK Cinema" <${EMAIL_USER}>`,
        to: email,
        subject: "Your SK Cinema Verification Code",
        html: `
      <h3>SK Cinema Account Verification</h3>
      <p>Your OTP is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    `,
    });
};

export const registerUser = async (
    email: string,
    password: string,
    confirmPassword: string
) => {
    if (!email || !password || !confirmPassword) {
        throw new AuthError("All fields are required", 400);
    }

    if (password !== confirmPassword) {
        throw new AuthError("Passwords do not match", 400);
    }

    if (password.length < 6) {
        throw new AuthError("Password must be at least 6 characters", 400);
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new AuthError("Email already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const otp = generateOTP();

    await prisma.user.create({
        data: {
            email,
            username: email.split("@")[0],
            password: hashedPassword,
            provider: "LOCAL",
            otp,
            otpExpiry: new Date(
                Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
            ),
        },
    });

    await sendOTPEmail(email, otp);

    return {
        message: "OTP sent to your email. Please verify your account.",
    };
};

export const verifyOTP = async (email: string, otp: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) throw new AuthError("User not found", 404);

    if (user.isVerified)
        throw new AuthError("Account already verified", 400);

    if (!user.otp || !user.otpExpiry)
        throw new AuthError("Invalid OTP", 400);

    if (user.otp !== otp)
        throw new AuthError("Incorrect OTP", 400);

    if (user.otpExpiry < new Date())
        throw new AuthError("OTP expired", 400);

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                otp: null,
                otpExpiry: null,
            },
        });

        await tx.channel.create({
            data: {
                name: user.username,
                username: user.username,
                userId: user.id,
            },
        });
    });

    return { message: "Account verified successfully" };
};

export const loginUser = async (
    email: string,
    password: string,
    remember = false
) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || user.provider !== "LOCAL") {
        throw new AuthError("Invalid credentials", 401);
    }

    if (!user.isVerified) {
        throw new AuthError("Please verify your email first", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password!);

    if (!isMatch) throw new AuthError("Invalid credentials", 401);

    const token = jwt.sign(
        { sub: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: remember ? "30d" : "1d" }
    );

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
        },
    };
};

export const generateResetToken = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) throw new AuthError("User not found", 404);

    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetToken,
            resetTokenExp: expiry,
        },
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
        from: `"SK Cinema" <${EMAIL_USER}>`,
        to: email,
        subject: "Reset Your SK Cinema Password",
        html: `
          <h3>Password Reset</h3>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link expires in 1 hour.</p>
        `,
    });

    return { message: "Reset instructions sent to your email" };
};

export const resetPassword = async (
    token: string,
    newPassword: string
) => {
    console.log("RESET BODY:", { token, newPassword });
    const user = await prisma.user.findFirst({
        where: { resetToken: token },
    });

    if (!user) {
        throw new AuthError("Invalid reset token", 400);
    }

    if (!user.resetTokenExp) {
        throw new AuthError("Reset token expired", 400);
    }

    const now = Date.now();
    const expiry = new Date(user.resetTokenExp).getTime();

    if (expiry <= now) {
        throw new AuthError("Reset token expired", 400);
    }

    if (!newPassword || newPassword.length < 6) {
        throw new AuthError("Password must be at least 6 characters", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExp: null,
        },
    });

    return { message: "Password reset successful" };
};