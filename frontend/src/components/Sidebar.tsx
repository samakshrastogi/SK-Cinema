import { Home, Compass, Film, Heart, User } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const items = [
        { icon: Home, path: "/home" },
        { icon: Film, path: "/playlists" },
        { icon: Heart, path: "/favorites" },
        { icon: User, path: "/profile" },
        { icon: Compass, path: "/explore" },
    ]

    return (
        <aside
            className="
        fixed left-4 top-1/2 -translate-y-1/2 z-40
        hidden md:flex flex-col items-center gap-4

        bg-white/10 backdrop-blur-xl
        border border-white/10
        rounded-2xl

        px-2 py-4
        shadow-[0_0_25px_rgba(0,0,0,0.3)]
      "
        >
            {items.map(({ icon: Icon, path }) => {
                const active = location.pathname === path

                return (
                    <button
                        key={path}
                        aria-label="h"
                        onClick={() => navigate(path)}
                        className={`
              p-3 rounded-xl transition-all duration-300

              ${active
                                ? "bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.25)] scale-105"
                                : "text-gray-300 hover:text-white hover:bg-white/10 hover:scale-110"
                            }
            `}
                    >
                        <Icon size={20} />
                    </button>
                )
            })}
        </aside>
    )
}

export default Sidebar