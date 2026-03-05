import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react";

interface User {
    id: number;
    email: string;
    username: string;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (token: string, user: User, remember?: boolean) => void;
    logout: () => void;
    setAuthFromOAuth: (token: string, user: User) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

const getStoredToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

const getStoredUser = () => {
    const stored =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
};

export const AuthProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [token, setToken] = useState<string | null>(
        getStoredToken()
    );
    const [user, setUser] = useState<User | null>(
        getStoredUser()
    );

    const login = (
        token: string,
        user: User,
        remember = false
    ) => {
        if (remember) {
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
        } else {
            sessionStorage.setItem("token", token);
            sessionStorage.setItem("user", JSON.stringify(user));
        }

        setToken(token);
        setUser(user);
    };

    const setAuthFromOAuth = (token: string, user: User) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        setToken(token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        const storedToken = getStoredToken();
        const storedUser = getStoredUser();

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(storedUser);
        }
    }, []);

    const value: AuthContextType = {
        token,
        user,
        login,
        logout,
        setAuthFromOAuth,
        isAuthenticated: !!token,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error(
            "useAuth must be used within AuthProvider"
        );
    }
    return context;
};