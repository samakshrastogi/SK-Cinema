/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

interface LayoutContextType {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    return (
        <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);

    if (!context) {
        throw new Error("useLayout must be used inside LayoutProvider");
    }

    return context;
};
