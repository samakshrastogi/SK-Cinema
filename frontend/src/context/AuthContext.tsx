/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react"
import { setAuthToken } from "@/api/axios"

interface User {
    id: number
    email: string
    username: string
    name?: string
    avatarUrl?: string
    avatarKey?: string
    createdAt?: string
    platformAdmin?: boolean
}

interface AuthContextType {
    token: string | null
    user: User | null
    loginId: number | null
    login: (token: string, user: User, remember?: boolean, loginId?: number | null) => void
    logout: () => void
    setAuthFromOAuth: (token: string, user: User, loginId?: number | null) => void
    updateUser: (user: User) => void
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/* ---------------- STORAGE HELPERS ---------------- */

const getStoredToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")

const getStoredUser = () => {

    try {

        const stored =
            localStorage.getItem("user") ||
            sessionStorage.getItem("user")

        if (!stored || stored === "undefined") {
            return null
        }

        return JSON.parse(stored)

    } catch {

        return null

    }

}

/* ---------------- PROVIDER ---------------- */

export const AuthProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {

    const [token, setToken] = useState<string | null>(getStoredToken())
    const [user, setUser] = useState<User | null>(getStoredUser())
    const [loginId, setLoginId] = useState<number | null>(() => {
        const stored = localStorage.getItem("loginId") || sessionStorage.getItem("loginId")
        return stored ? Number(stored) : null
    })

    useEffect(() => {
        setAuthToken(token)
    }, [token])

    useEffect(() => {
        if (token && !localStorage.getItem("sessionStart") && !sessionStorage.getItem("sessionStart")) {
            const storage = localStorage.getItem("token") ? localStorage : sessionStorage
            storage.setItem("sessionStart", String(Date.now()))
        }
    }, [token])

    useEffect(() => {
        const handleUnload = () => {
            const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token")
            const storedLoginId = localStorage.getItem("loginId") || sessionStorage.getItem("loginId")
            const storedStart = localStorage.getItem("sessionStart") || sessionStorage.getItem("sessionStart")

            if (!storedToken || !storedLoginId || !storedStart) return

            const durationSec = Math.max(0, Math.floor((Date.now() - Number(storedStart)) / 1000))
            const payload = JSON.stringify({
                token: storedToken,
                loginId: Number(storedLoginId),
                durationSec
            })

            const blob = new Blob([payload], { type: "application/json" })
            navigator.sendBeacon(`${import.meta.env.VITE_API_URL}/auth/session-end`, blob)
        }

        window.addEventListener("beforeunload", handleUnload)
        return () => window.removeEventListener("beforeunload", handleUnload)
    }, [])

    /* ---------------- LOGIN ---------------- */

    const login = (
        token: string,
        user: User,
        remember = false,
        loginIdValue?: number | null
    ) => {

        const storage = remember ? localStorage : sessionStorage

        storage.setItem("token", token)
        storage.setItem("user", JSON.stringify(user))
        storage.setItem("sessionStart", String(Date.now()))
        if (loginIdValue) {
            storage.setItem("loginId", String(loginIdValue))
            setLoginId(loginIdValue)
        }

        setToken(token)
        setUser(user)

    }

    /* ---------------- GOOGLE OAUTH ---------------- */

    const setAuthFromOAuth = (token: string, user: User, loginIdParam?: number | null) => {

        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.setItem("sessionStart", String(Date.now()))
        if (loginIdParam) {
            localStorage.setItem("loginId", String(loginIdParam))
            setLoginId(loginIdParam)
        }

        setToken(token)
        setUser(user)

    }

    /* ---------------- UPDATE USER (PROFILE / AVATAR) ---------------- */

    const updateUser = (updatedUser: User) => {

        setUser(updatedUser)

        const storage =
            localStorage.getItem("token") ? localStorage : sessionStorage

        storage.setItem("user", JSON.stringify(updatedUser))

    }

    /* ---------------- LOGOUT ---------------- */

    const logout = async () => {
        try {
            const storedStart = localStorage.getItem("sessionStart") || sessionStorage.getItem("sessionStart")
            const durationSec = storedStart
                ? Math.max(0, Math.floor((Date.now() - Number(storedStart)) / 1000))
                : 0

            if (token && loginId) {
                await fetch(`${import.meta.env.VITE_API_URL}/auth/session-end`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token,
                        loginId,
                        durationSec
                    })
                })
            }
        } catch {
            // ignore
        }

        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("loginId")
        localStorage.removeItem("sessionStart")

        sessionStorage.removeItem("token")
        sessionStorage.removeItem("user")
        sessionStorage.removeItem("loginId")
        sessionStorage.removeItem("sessionStart")

        setToken(null)
        setUser(null)
        setLoginId(null)

    }
    /* ---------------- CONTEXT VALUE ---------------- */

    const value: AuthContextType = {
        token,
        user,
        loginId,
        login,
        logout,
        setAuthFromOAuth,
        updateUser,
        isAuthenticated: !!token,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )

}

/* ---------------- HOOK ---------------- */

export const useAuth = () => {

    const context = useContext(AuthContext)

    if (!context) {
        throw new Error(
            "useAuth must be used within AuthProvider"
        )
    }

    return context

}
