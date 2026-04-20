import { useEffect, useState } from "react"
import { Home, Search, Film, Heart, User, Smartphone } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "@/api/axios"

const MobileBottomNav = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [hasPortraitVideos, setHasPortraitVideos] = useState(false)

    useEffect(() => {
        let mounted = true
        api.get("/video/portrait")
            .then((res) => {
                if (mounted) {
                    setHasPortraitVideos((res.data?.data || []).length > 0)
                }
            })
            .catch(() => {
                if (mounted) setHasPortraitVideos(false)
            })

        return () => {
            mounted = false
        }
    }, [])

    const items = [
        { icon: Home, path: "/home" },
        { icon: Search, path: "/search" },
        ...(hasPortraitVideos ? [{ icon: Smartphone, path: "/portrait" }] : []),
        { icon: Film, path: "/playlists" },
        { icon: Heart, path: "/favorites" },
        { icon: User, path: "/profile" },
    ]

    return (
        <div
            className="
        fixed bottom-0 left-0 w-full z-50
        md:hidden
        bg-white/5 backdrop-blur-xl
        border-t border-white/10
        px-4 py-2
      "
        >
            <div className="flex justify-between items-center">
                {items.map(({ icon: Icon, path }) => {
                    const active = location.pathname === path

                    return (
                        <button
                            key={path}
                            aria-label="h"
                            onClick={() => navigate(path)}
                            className="flex flex-col items-center justify-center flex-1 py-1"
                        >
                            <div
                                className={`p-2 rounded-lg transition-all${active
                                        ? "bg-white/20 text-white"
                                        : "text-gray-400"
                                    }
                `}
                            >
                                <Icon size={20} />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default MobileBottomNav
