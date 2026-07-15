import { useEffect, useRef, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { BadgeCheck } from "lucide-react"

import Home from "@/pages/Home"
import Upload from "@/pages/Upload"
import VideoPlayer from "@/pages/VideoPlayer"
import S3Import from "@/pages/S3Import"
import FavouritesPage from "@/pages/FavouritesPage"
import PlaylistPage from "@/pages/PlaylistPage"
import SearchPage from "@/pages/Search"
import PortraitPlayer from "@/pages/PortraitPlayer"
import OrganizationDashboard from "@/pages/OrganizationDashboard"
import OrganizationPage from "@/pages/OrganizationPage"
import AdminDashboard from "@/pages/AdminDashboard"
import SettingsPage from "@/pages/SettingsPage"

import MainLayout from "@/layouts/MainLayout"
import ProtectedRoute from "@/routes/ProtectedRoute"
import ProfilePage from "@/pages/ProfilePage"
import { useAuth } from "@/context/AuthContext"
import { redirectToCentralLogin } from "@/api/centralAuth"


function CentralLoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) redirectToCentralLogin()
  }, [isAuthenticated, isLoading])

  if (isAuthenticated) return <Navigate to="/home" replace />
  return <div className="min-h-screen grid place-items-center bg-[#050816] text-white font-semibold">Connecting to SK Central...</div>
}
function DeveloperCredit() {
  const [open, setOpen] = useState(false)
  const creditRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (open && !creditRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [open])

  return (
    <div ref={creditRef} className="group fixed bottom-24 right-4 z-[100] flex items-center">
      <a
        href="https://www.linkedin.com/in/samaksh-rastogi-9638b9254/"
        target="_blank"
        rel="noreferrer"
        className={`${open ? "flex" : "hidden group-hover:flex group-focus-within:flex"} items-center whitespace-nowrap rounded-l-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-xl`}
      >
        Developed by <span className="ml-1 text-emerald-600 underline decoration-2 underline-offset-4">Samaksh Rastogi</span>
      </a>
      <button type="button" onClick={() => setOpen((current) => !current)} className={`${open ? "rounded-r-2xl" : "rounded-2xl group-hover:rounded-l-none group-focus-within:rounded-l-none"} grid h-12 w-12 place-items-center bg-white text-cyan-600 shadow-xl`} aria-label={open ? "Hide developer credit" : "Show developer credit"} aria-expanded={open}>
        <BadgeCheck className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}

function App() {
  return (
    <>
      <Routes>

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<CentralLoginRedirect />} />
      <Route path="/register" element={<CentralLoginRedirect />} />
      <Route path="/oauth-success" element={<CentralLoginRedirect />} />
      <Route path="/reset-password" element={<CentralLoginRedirect />} />

      <Route
        path="/video/:publicId"
        element={
          <ProtectedRoute>
            <VideoPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portrait/:publicId"
        element={
          <ProtectedRoute>
            <PortraitPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portrait"
        element={
          <ProtectedRoute>
            <PortraitPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >

        <Route path="/upload" element={<Upload />} />

        <Route path="/s3-import" element={<S3Import />} />

        <Route path="/favorites" element={<FavouritesPage />} />

        <Route path="/playlists" element={<PlaylistPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/organization/dashboard" element={<OrganizationDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
      <DeveloperCredit />
    </>
  )
}

export default App
