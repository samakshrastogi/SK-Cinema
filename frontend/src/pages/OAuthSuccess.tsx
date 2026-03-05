import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
    sub: number;
    email: string;
    username?: string;
}

const OAuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuthFromOAuth } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        try {
            const decoded = jwtDecode<DecodedToken>(token);

            const user = {
                id: decoded.sub,
                email: decoded.email,
                username:
                    decoded.username || decoded.email.split("@")[0],
            };

            setAuthFromOAuth(token, user);

            navigate("/home", { replace: true });
        } catch {
            navigate("/login", { replace: true });
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <p className="text-lg animate-pulse">Logging you in...</p>
        </div>
    );
};

export default OAuthSuccess;