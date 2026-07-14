/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react"
import { api, clearStoredAuth, setAuthToken } from "@/api/axios"
import { API_URL } from "@/config/env"
import { logoutFromCentral, requestCentralAppToken } from "@/api/centralAuth"

interface User {
    id: string
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
    loginId: string | null
    login: (token: string, user: User, remember?: boolean, loginId?: string | null) => void
    logout: () => void
    setAuthFromOAuth: (token: string, user: User, loginId?: string | null) => void
    updateUser: (user: User) => void
    isAuthenticated: boolean
    isLoading: boolean
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

const getStoredLoginId = () =>
    localStorage.getItem("loginId") ||
    sessionStorage.getItem("loginId")

/* ---------------- PROVIDER ---------------- */

export const AuthProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {

    const [token, setToken] = useState<string | null>(getStoredToken())
    const [user, setUser] = useState<User | null>(getStoredUser())
    const [loginId, setLoginId] = useState<string | null>(() => getStoredLoginId())
    const [isLoading, setIsLoading] = useState(!getStoredToken())


    useEffect(() => {
        if (getStoredToken()) {
            setIsLoading(false)
            return
        }

        let cancelled = false
        const connectCentral = async () => {
            try {
                const centralToken = await requestCentralAppToken()
                const response = await api.post("/auth/central", { token: centralToken })
                const data = response.data.data
                if (cancelled) return
                localStorage.setItem("token", data.token)
                localStorage.setItem("user", JSON.stringify(data.user))
                localStorage.setItem("loginId", data.loginId)
                localStorage.setItem("sessionStart", String(Date.now()))
                setAuthToken(data.token)
                setToken(data.token)
                setUser(data.user)
                setLoginId(data.loginId)
            } catch {
                // Protected routes send unauthenticated users to the Central login handoff.
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        void connectCentral()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        setAuthToken(token)
    }, [token])

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (
                event.storageArea !== localStorage ||
                !["token", "user", "loginId", "sessionStart"].includes(event.key || "")
            ) {
                return
            }

            setToken(getStoredToken())
            setUser(getStoredUser())
            setLoginId(getStoredLoginId())
        }

        window.addEventListener("storage", handleStorageChange)
        return () => window.removeEventListener("storage", handleStorageChange)
    }, [])

    useEffect(() => {
        if (!token) return

        let cancelled = false

        const validateSession = async () => {
            try {
                await api.get("/auth/session")
            } catch {
                if (!cancelled) {
                    clearStoredAuth()
                    setToken(null)
                    setUser(null)
                    setLoginId(null)
                    try {
                        const centralToken = await requestCentralAppToken()
                        const response = await api.post("/auth/central", { token: centralToken })
                        const data = response.data.data
                        if (cancelled) return
                        localStorage.setItem("token", data.token)
                        localStorage.setItem("user", JSON.stringify(data.user))
                        localStorage.setItem("loginId", data.loginId)
                        localStorage.setItem("sessionStart", String(Date.now()))
                        setAuthToken(data.token)
                        setToken(data.token)
                        setUser(data.user)
                        setLoginId(data.loginId)
                    } catch {
                        // The login route performs the Central handoff when no Central session exists.
                    }
                }
            }
        }

        validateSession()

        return () => {
            cancelled = true
        }
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
                loginId: storedLoginId,
                durationSec
            })

            const blob = new Blob([payload], { type: "application/json" })
            navigator.sendBeacon(`${API_URL}/auth/session-end`, blob)
        }

        window.addEventListener("beforeunload", handleUnload)
        return () => window.removeEventListener("beforeunload", handleUnload)
    }, [])

    useEffect(() => {
        const handleAuthExpired = () => {
            const pathname = window.location.pathname
            const isPublicRoute =
                pathname === "/" ||
                pathname === "/home" ||
                pathname === "/search" ||
                pathname === "/login" ||
                pathname === "/register" ||
                pathname === "/oauth-success" ||
                pathname === "/reset-password" ||
                pathname === "/portrait" ||
                pathname.startsWith("/video/") ||
                pathname.startsWith("/portrait/")

            clearStoredAuth()
            setToken(null)
            setUser(null)
            setLoginId(null)

            if (!isPublicRoute) {
                window.location.href = "/login"
            }
        }

        window.addEventListener("auth:expired", handleAuthExpired)
        return () => window.removeEventListener("auth:expired", handleAuthExpired)
    }, [])

    /* ---------------- LOGIN ---------------- */

    const login = (
        token: string,
        user: User,
        _remember = false,
        loginIdValue?: string | null
    ) => {

        sessionStorage.removeItem("token")
        sessionStorage.removeItem("user")
        sessionStorage.removeItem("loginId")
        sessionStorage.removeItem("sessionStart")
        localStorage.removeItem("loginId")

        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.setItem("sessionStart", String(Date.now()))
        if (loginIdValue) {
            localStorage.setItem("loginId", String(loginIdValue))
            setLoginId(loginIdValue)
        }

        setToken(token)
        setUser(user)

    }

    /* ---------------- GOOGLE OAUTH ---------------- */

    const setAuthFromOAuth = (token: string, user: User, loginIdParam?: string | null) => {

        sessionStorage.removeItem("token")
        sessionStorage.removeItem("user")
        sessionStorage.removeItem("loginId")
        sessionStorage.removeItem("sessionStart")
        localStorage.removeItem("loginId")

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
        localStorage.setItem("user", JSON.stringify(updatedUser))

    }

    /* ---------------- LOGOUT ---------------- */

    const logout = async () => {
        try {
            const storedStart = localStorage.getItem("sessionStart") || sessionStorage.getItem("sessionStart")
            const durationSec = storedStart
                ? Math.max(0, Math.floor((Date.now() - Number(storedStart)) / 1000))
                : 0

            if (token && loginId) {
                await fetch(`${API_URL}/auth/session-end`, {
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

        await logoutFromCentral()
        clearStoredAuth()
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
        isLoading,
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
