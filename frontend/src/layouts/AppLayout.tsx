import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import MobileBottomNav from "@/components/MobileBottomNav"
import { useLayout } from "@/context/LayoutContext"

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { sidebarOpen } = useLayout()

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
          px-4 md:px-6
          pb-20 md:pb-10
          transition-all duration-300

          ml-0
          ${sidebarOpen ? "md:ml-64" : "md:ml-20"}
        `}
            >
                <div className="max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>

            {/* ✅ Mobile Bottom Navigation */}
            <MobileBottomNav />

        </div>
    )
}

export default AppLayout