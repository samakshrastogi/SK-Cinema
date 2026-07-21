/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react"
import { api, clearStoredAuth, setAuthToken } from "@/api/axios"
import { API_URL } from "@/config/env"
import { getCentralProfile, getCentralSessionState, redirectToCentralLogin, requestCentralAppToken } from "@/api/centralAuth"

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

const mergeCentralProfile = (user: User) => {
    const centralProfile = getCentralProfile()
    return centralProfile
        ? { ...user, name: centralProfile.name || user.name, avatarUrl: centralProfile.avatarUrl || user.avatarUrl }
        : user
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
    centralLoginRequired: boolean
    connectionError: string | null
    retryCentralConnection: () => void
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
    const [centralLoginRequired, setCentralLoginRequired] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [connectionAttempt, setConnectionAttempt] = useState(0)


    useEffect(() => {
        if (getStoredToken()) {
            void requestCentralAppToken()
                .then(() => setUser((current) => current ? mergeCentralProfile(current) : current))
                .catch(() => undefined)
            setIsLoading(false)
            return
        }

        let cancelled = false
        const connectCentral = async () => {
            setIsLoading(true)
            setCentralLoginRequired(false)
            setConnectionError(null)
            let centralToken: string
            try {
                centralToken = await requestCentralAppToken()
            } catch (error) {
                if (cancelled) return
                const status = (error as { status?: number })?.status
                setCentralLoginRequired(status === 401 || status === 403)
                if (status !== 401 && status !== 403) setConnectionError(error instanceof Error ? error.message : "Unable to reach SK Central")
                setIsLoading(false)
                return
            }

            try {
                let response
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    try {
                        response = await api.post("/auth/central", { token: centralToken }, { timeout: 30_000 })
                        break
                    } catch (error) {
                        if (attempt === 2) throw error
                        await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)))
                    }
                }
                if (!response) throw new Error("MediaFlow did not complete the SK Central exchange")
                const data = response.data.data
                if (cancelled) return
                localStorage.setItem("token", data.token)
                localStorage.setItem("user", JSON.stringify(mergeCentralProfile(data.user)))
                localStorage.setItem("loginId", data.loginId)
                localStorage.setItem("sessionStart", String(Date.now()))
                setAuthToken(data.token)
                setToken(data.token)
                setUser(mergeCentralProfile(data.user))
                setLoginId(data.loginId)
            } catch (error) {
                if (!cancelled) setConnectionError((error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : "MediaFlow could not complete sign-in"))
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        void connectCentral()
        return () => { cancelled = true }
    }, [connectionAttempt])

    useEffect(() => {
        setAuthToken(token)
    }, [token])

    useEffect(() => {
        if (!token) return
        let checkInFlight = false
        const verifyCentralSession = async () => {
            if (checkInFlight) return
            checkInFlight = true
            const active = await getCentralSessionState()
            checkInFlight = false
            if (active === false) {
                clearStoredAuth()
                setToken(null)
                setUser(null)
                setLoginId(null)
                redirectToCentralLogin()
            }
        }
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") void verifyCentralSession()
        }

        void verifyCentralSession()
        window.addEventListener("focus", verifyCentralSession)
        document.addEventListener("visibilitychange", onVisibilityChange)
        const interval = window.setInterval(verifyCentralSession, 30_000)
        return () => {
            window.removeEventListener("focus", verifyCentralSession)
            document.removeEventListener("visibilitychange", onVisibilityChange)
            window.clearInterval(interval)
        }
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
                    let centralToken: string
                    try {
                        centralToken = await requestCentralAppToken()
                    } catch (error) {
                        if (cancelled) return
                        const status = (error as { status?: number })?.status
                        setCentralLoginRequired(status === 401 || status === 403)
                        if (status !== 401 && status !== 403) {
                            setConnectionError(error instanceof Error ? error.message : "Unable to reach SK Central")
                        }
                        return
                    }

                    try {
                        const response = await api.post("/auth/central", { token: centralToken })
                        const data = response.data.data
                        if (cancelled) return
                        localStorage.setItem("token", data.token)
                        localStorage.setItem("user", JSON.stringify(mergeCentralProfile(data.user)))
                        localStorage.setItem("loginId", data.loginId)
                        localStorage.setItem("sessionStart", String(Date.now()))
                        setAuthToken(data.token)
                        setToken(data.token)
                        setUser(mergeCentralProfile(data.user))
                        setLoginId(data.loginId)
                    } catch (error) {
                        if (!cancelled) {
                            setConnectionError(
                                (error as { response?: { data?: { message?: string } } })?.response?.data?.message
                                || (error instanceof Error ? error.message : "MediaFlow could not complete sign-in")
                            )
                        }
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
        centralLoginRequired,
        connectionError,
        retryCentralConnection: () => setConnectionAttempt((attempt) => attempt + 1),
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
