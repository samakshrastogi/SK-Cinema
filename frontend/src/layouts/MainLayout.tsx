import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">

      <Sidebar />

      <Topbar />

      <main className=" transition-all duration-300">
        <Outlet />
      </main>

    </div>
  );
};

export default MainLayout;