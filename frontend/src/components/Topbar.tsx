import { useEffect, useRef, useState } from "react"
import { Search, Bell, Menu } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLayout } from "@/context/LayoutContext"
import { useNavigate, useLocation } from "react-router-dom"

const Topbar = () => {
    const { logout, user } = useAuth()
    const { toggleSidebar } = useLayout()
    const navigate = useNavigate()
    const location = useLocation()

    const [query, setQuery] = useState("")
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    const getInitials = (name?: string) => {
        if (!name) return "?"
        return name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const avatarSrc = (() => {
        if (!user) return null
        if (user.avatarUrl) return user.avatarUrl
        if (user.avatarKey) {
            if (user.avatarKey.startsWith("http")) return user.avatarKey
            return `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}/${user.avatarKey}`
        }
        return null
    })()

    // ✅ Only show toggle on specific pages (mobile only)
    const showSidebarToggle =
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/settings") ||
        location.pathname.startsWith("/admin")

    return (
        <header
            className="
        fixed top-0 left-0 right-0 h-[64px]
        flex items-center justify-between
        px-4 md:px-6
        bg-[#1b1236]/80 backdrop-blur-xl border-b border-white/10
        z-50
      "
        >
            {/* 🔷 LEFT */}
            <div className="flex items-center gap-3 md:gap-4">

                {/* ✅ HAMBURGER → ONLY MOBILE + CONTEXTUAL */}
                {showSidebarToggle && (
                    <button
                        onClick={toggleSidebar}
                        className="
              md:hidden
              p-2 rounded-lg
              hover:bg-white/10
              transition
              opacity-80 hover:opacity-100
            "
                        aria-label="h"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {/* LOGO */}
                <h1
                    onClick={() => navigate("/home")}
                    className="text-base sm:text-lg md:text-xl font-bold cursor-pointer whitespace-nowrap"
                >
                    🎬 SK Cinema
                </h1>

                {/* SEARCH (DESKTOP) */}
                <div className="hidden md:flex items-center bg-white/10 px-4 py-2 rounded-lg w-[260px] lg:w-[380px] focus-within:ring-2 focus-within:ring-purple-500">
                    <Search size={18} className="text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search films..."
                        className="bg-transparent outline-none ml-2 w-full text-sm"
                    />
                </div>
            </div>

            {/* 🔷 RIGHT */}
            <div className="flex items-center gap-3 md:gap-4 relative">

                {/* SEARCH ICON (MOBILE) */}
                <button className="md:hidden p-2 bg-white/10 rounded-lg" aria-label="h">
                    <Search size={18} />
                </button>

                {/* UPLOAD */}
                <button
                    onClick={() => navigate("/upload")}
                    className="hidden sm:block bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm active:scale-95 transition"
                >
                    Upload
                </button>

                {/* NOTIFICATIONS */}
                <Bell className="text-gray-300 cursor-pointer" />

                {/* PROFILE */}
                <div ref={dropdownRef} className="relative">
                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 overflow-hidden flex items-center justify-center cursor-pointer font-semibold"
                    >
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt="User Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            getInitials(user?.name)
                        )}
                    </div>

                    {dropdownOpen && user && (
                        <div className="absolute right-0 mt-3 w-60 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-4">
                            <p className="font-semibold text-lg">{user.name}</p>

                            <p className="text-sm text-gray-400">
                                Joined:{" "}
                                {user.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString()
                                    : "N/A"}
                            </p>

                            <button
                                onClick={() => {
                                    setDropdownOpen(false)
                                    navigate("/profile")
                                }}
                                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 transition p-2 rounded-lg text-sm"
                            >
                                View Profile
                            </button>

                            <button
                                onClick={handleLogout}
                                className="mt-2 w-full bg-red-600 hover:bg-red-700 transition p-2 rounded-lg text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Topbar