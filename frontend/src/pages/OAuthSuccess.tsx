import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/api/axios"

const OAuthSuccess = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { setAuthFromOAuth } = useAuth()

    useEffect(() => {
        const handleOAuth = async () => {
            const token = searchParams.get("token")

            if (!token) {
                navigate("/login", { replace: true })
                return
            }

            try {
                const res = await api.get("/user/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const user = res.data.data.user

                setAuthFromOAuth(token, user)

                navigate("/home", { replace: true })
            } catch (err) {
                navigate("/login", { replace: true })
            }
        }

        handleOAuth()
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <p className="text-lg animate-pulse">Logging you in...</p>
        </div>
    )
}

export default OAuthSuccess