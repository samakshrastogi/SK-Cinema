import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useLayout } from "@/context/LayoutContext";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { sidebarOpen } = useLayout();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">

            {/* Sidebar */}
            <Sidebar />

            {/* Topbar */}
            <Topbar />

            {/* Main Content */}
            <main
                className={`
          pt-[80px]
          px-6 pb-10
          transition-all duration-300
          ${sidebarOpen ? "ml-64" : "ml-20"}
        `}
            >
                <div className="max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>

        </div>
    );
};

export default AppLayout;