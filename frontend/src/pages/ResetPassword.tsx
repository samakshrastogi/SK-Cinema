import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "@/api/auth.api";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleReset = async () => {
        if (!token) {
            setError("Invalid reset link");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const res = await resetPassword(token, newPassword);
            if (!res.success) throw new Error(res.message);

            setSuccess("Password reset successful. Redirecting to login...");

            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Reset failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-96 space-y-4">
                <h2 className="text-xl font-semibold text-center">
                    Reset Password
                </h2>

                {error && (
                    <div className="text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-green-400 text-sm text-center">
                        {success}
                    </div>
                )}

                <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700"
                />

                <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-gray-700"
                />

                <button
                    onClick={handleReset}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600"
                >
                    Reset Password
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;