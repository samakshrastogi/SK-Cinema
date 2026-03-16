import { useEffect, useRef, useState } from "react"
import { Search, Bell } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLayout } from "@/context/LayoutContext"
import { api } from "@/api/axios"
import { useNavigate } from "react-router-dom"

interface User {
    id: number
    username: string
    name: string
    createdAt: string
    avatarUrl?: string
    avatarKey?: string
}

const Topbar = () => {

    const { logout, user } = useAuth()
    const { sidebarOpen } = useLayout()
    const navigate = useNavigate()

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

        return () =>
            document.removeEventListener("mousedown", handleClickOutside)

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

    return (

        <header
            className={`
        fixed top-0 right-0 h-[64px]
        flex items-center justify-between
        px-6
        bg-[#1b1236]/80 backdrop-blur-xl border-b border-white/10
        transition-all duration-300 z-100
        ${sidebarOpen ? "left-64" : "left-20"}
      `}
        >

            {/* Left */}
            <div className="flex items-center gap-4">

                <h1
                    onClick={() => navigate("/home")}
                    className="text-lg sm:text-xl font-bold cursor-pointer"
                >
                    🎬 SK Cinema
                </h1>

                <div className="hidden sm:flex items-center bg-white/10 px-4 py-2 rounded-lg w-[260px] lg:w-[380px]">

                    <Search size={18} className="text-gray-400" />

                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search films..."
                        className="bg-transparent outline-none ml-2 w-full text-sm"
                    />

                </div>

            </div>

            {/* Right */}
            <div className="flex items-center gap-4 relative">

                <button
                    onClick={() => navigate("/upload")}
                    className="hidden sm:block bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"
                >
                    Upload
                </button>

                <Bell className="text-gray-300 cursor-pointer" />

                <div ref={dropdownRef} className="relative">

                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 overflow-hidden flex items-center justify-center cursor-pointer font-semibold"
                    >
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            getInitials(user?.name)
                        )}
                    </div>

                    {dropdownOpen && user && (

                        <div className="absolute right-0 mt-3 w-60 bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-4">

                            <p className="font-semibold text-lg">
                                {user.name}
                            </p>

                            <p className="text-sm text-gray-400">
                                Joined: {new Date(user.createdAt).toLocaleDateString()}
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