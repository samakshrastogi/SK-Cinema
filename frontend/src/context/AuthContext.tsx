import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react"

interface User {
    id: number
    email: string
    username: string
    name?: string
    avatarUrl?: string
    avatarKey?: string
}

interface AuthContextType {
    token: string | null
    user: User | null
    login: (token: string, user: User, remember?: boolean) => void
    logout: () => void
    setAuthFromOAuth: (token: string, user: User) => void
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

    /* ---------------- LOGIN ---------------- */

    const login = (
        token: string,
        user: User,
        remember = false
    ) => {

        const storage = remember ? localStorage : sessionStorage

        storage.setItem("token", token)
        storage.setItem("user", JSON.stringify(user))

        setToken(token)
        setUser(user)

    }

    /* ---------------- GOOGLE OAUTH ---------------- */

    const setAuthFromOAuth = (token: string, user: User) => {

        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))

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

    const logout = () => {

        localStorage.removeItem("token")
        localStorage.removeItem("user")

        sessionStorage.removeItem("token")
        sessionStorage.removeItem("user")

        setToken(null)
        setUser(null)

    }

    /* ---------------- INIT FROM STORAGE ---------------- */

    useEffect(() => {

        const storedToken = getStoredToken()
        const storedUser = getStoredUser()

        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(storedUser)
        }

    }, [])

    /* ---------------- CONTEXT VALUE ---------------- */

    const value: AuthContextType = {
        token,
        user,
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