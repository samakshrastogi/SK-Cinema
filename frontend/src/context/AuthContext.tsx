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
    name?: string;
    avatarUrl?: string;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (token: string, user: User, remember?: boolean) => void;
    logout: () => void;
    setAuthFromOAuth: (token: string, user: User) => void;
    updateUser: (user: User) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

const getStoredToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

const getStoredUser = () => {
    try {
        const stored =
            localStorage.getItem("user") ||
            sessionStorage.getItem("user");

        if (!stored || stored === "undefined") {
            return null;
        }

        return JSON.parse(stored);
    } catch {
        return null;
    }
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

    const updateUser = (updatedUser: User) => {

        setUser(updatedUser);

        const storage =
            localStorage.getItem("token") ? localStorage : sessionStorage;

        storage.setItem("user", JSON.stringify(updatedUser));

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
        updateUser,
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
