import { useState, useEffect } from "react";
import {
    loginUser,
    registerUser,
    verifyOTP,
    forgotPassword,
    googleLogin,
} from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Auth = () => {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [step, setStep] = useState<"form" | "otp">("form");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [remember, setRemember] = useState(false);

    const [forgotEmail, setForgotEmail] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);

    const { login, token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (token) navigate("/home");
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            if (mode === "login") {
                const res = await loginUser(email, password, remember);

                if (!res.success) throw new Error(res.message);

                login(res.data!.token, res.data!.user, remember);
                navigate("/home");
            } else {
                const res = await registerUser(email, password, confirmPassword);

                if (!res.success) throw new Error(res.message);

                setSuccessMessage("OTP sent to your email.");
                setStep("otp");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        try {
            setError(null);
            setLoading(true);

            const res = await verifyOTP(email, otp);

            if (!res.success) throw new Error(res.message);

            setSuccessMessage("Account verified successfully. Please login.");
            setMode("login");
            setStep("form");
            setOtp("");
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {

        try {
            setError(null);
            setSuccessMessage(null);
            setLoading(true);

            const res = await forgotPassword(forgotEmail);

            if (!res.success) throw new Error(res.message);

            setSuccessMessage("Reset instructions sent to your email.");
            setShowForgot(false);
            setForgotEmail("");
        } catch (err: any) {
            setError(err.response?.data?.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-black text-white">

            <div className="relative z-10 w-full max-w-md p-10 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                        SK Cinema
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">
                        {mode === "login" ? "Welcome back" : "Create your account"}
                    </p>
                </div>

                <div className="relative flex bg-black/40 rounded-xl p-1 mb-6">
                    <div
                        className={`absolute top-1 bottom-1 w-1/2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ${mode === "login" ? "left-1" : "left-1/2"
                            }`}
                    />
                    <button
                        onClick={() => {
                            setMode("login");
                            setError(null);
                            setStep("form");
                        }}
                        className="relative flex-1 py-2 text-sm font-medium z-10"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => {
                            setMode("register");
                            setError(null);
                            setStep("form");
                        }}
                        className="relative flex-1 py-2 text-sm font-medium z-10"
                    >
                        Register
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-500/20 border border-green-500 text-green-400 text-sm p-3 rounded-lg mb-4 text-center">
                        {successMessage}
                    </div>
                )}

                {step === "form" ? (
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        />

                        {mode === "register" && (
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        )}

                        {mode === "login" && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={() => setRemember(!remember)}
                                    />
                                    Remember me
                                </label>
                                <span
                                    onClick={() => setShowForgot(true)}
                                    className="text-purple-400 cursor-pointer"
                                >
                                    Forgot password?
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                            {loading
                                ? "Processing..."
                                : mode === "login"
                                    ? "Login"
                                    : "Register"}
                        </button>

                        <button
                            type="button"
                            onClick={googleLogin}
                            className="w-full py-3 rounded-xl bg-white text-black font-semibold"
                        >
                            Continue with Google
                        </button>

                    </form>
                ) : (
                    <div className="space-y-5">
                        <input
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700"
                        />
                        <button
                            onClick={handleVerifyOTP}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                            Verify OTP
                        </button>
                    </div>
                )}
            </div>

            {showForgot && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-[#0f172a] p-8 rounded-2xl w-96 space-y-4 border border-white/10 shadow-2xl">
                        <h3 className="text-lg font-semibold text-white">
                            Reset Password
                        </h3>

                        <input
                            type="email"
                            placeholder="Enter email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-gray-700 focus:border-purple-500 outline-none text-white"
                        />

                        <button
                            onClick={handleForgotPassword}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-semibold"
                        >
                            Send Reset Email
                        </button>

                        <button
                            onClick={() => setShowForgot(false)}
                            className="w-full text-sm text-gray-400 hover:text-white transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Auth;