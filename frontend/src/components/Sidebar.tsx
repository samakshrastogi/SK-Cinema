import { Home, Compass, Film, Heart, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLayout } from "@/context/LayoutContext";

const Sidebar = () => {
    const { sidebarOpen, toggleSidebar } = useLayout();
    const navigate = useNavigate();

    return (
        <aside
            className={`
        fixed top-0 left-0 z-40
        ${sidebarOpen ? "md:w-64" : "md:w-20"}
        w-64
        h-screen
        transition-all duration-300
        bg-white/5 backdrop-blur-xl border-r border-white/10
        p-6
      `}
        >

            {/* Toggle */}
            <button
                onClick={toggleSidebar}
                className="mb-8 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
                <Menu size={20} />
            </button>

            <nav className="space-y-6">

                <SidebarItem
                    icon={<Home size={20} />}
                    label="Home"
                    open={sidebarOpen}
                    onClick={() => navigate("/home")}
                />

                <SidebarItem
                    icon={<Compass size={20} />}
                    label="Explore"
                    open={sidebarOpen}
                />

                <SidebarItem
                    icon={<Film size={20} />}
                    label="Genres"
                    open={sidebarOpen}
                />

                <SidebarItem
                    icon={<Heart size={20} />}
                    label="Favorites"
                    open={sidebarOpen}
                />

            </nav>

        </aside>
    );
};

interface ItemProps {
    icon: React.ReactNode;
    label: string;
    open: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon, label, open, onClick }: ItemProps) => {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 text-gray-300 hover:text-white cursor-pointer transition"
        >
            {icon}

            {open && <span className="text-sm">{label}</span>}
        </div>
    );
};

export default Sidebar;