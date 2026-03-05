import { api } from "./axios";

/* ================= TYPES ================= */

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface LoginData {
    token: string;
    user: {
        id: number;
        email: string;
        username: string;
    };
}

/* ================= REGISTER ================= */

export const registerUser = async (
    email: string,
    password: string,
    confirmPassword: string
): Promise<ApiResponse> => {
    const response = await api.post("/auth/register", {
        email,
        password,
        confirmPassword,
    });

    return response.data;
};

/* ================= VERIFY OTP ================= */

export const verifyOTP = async (
    email: string,
    otp: string
): Promise<ApiResponse> => {
    const response = await api.post("/auth/verify-otp", {
        email,
        otp,
    });

    return response.data;
};

/* ================= LOGIN ================= */

export const loginUser = async (
    email: string,
    password: string,
    remember: boolean
): Promise<ApiResponse<LoginData>> => {
    const response = await api.post("/auth/login", {
        email,
        password,
        remember,
    });

    return response.data;
};

/* ================= FORGOT PASSWORD ================= */

export const forgotPassword = async (
    email: string
): Promise<ApiResponse> => {
    const response = await api.post("/auth/forgot-password", {
        email,
    });

    return response.data;
};

/* ================= RESET PASSWORD ================= */

export const resetPassword = async (
    token: string,
    newPassword: string
): Promise<ApiResponse> => {

    const response = await api.post("/auth/reset-password", {
        token,
        newPassword,
    });

    return response.data;
};

/* ================= GOOGLE LOGIN ================= */

export const googleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
};