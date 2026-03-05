import Navbar from "@/components/Navbar";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="p-6">{children}</main>
    </div>
  );
};

export default MainLayout;