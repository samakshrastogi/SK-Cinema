import { Routes, Route, Navigate } from "react-router-dom"

import Home from "@/pages/Home"
import Auth from "@/pages/Auth"
import Upload from "@/pages/Upload"
import VideoPlayer from "@/pages/VideoPlayer"
import S3Import from "@/pages/S3Import"
import OAuthSuccess from "@/pages/OAuthSuccess"
import ResetPassword from "@/pages/ResetPassword"
import FavouritesPage from "@/pages/FavouritesPage"
import PlaylistPage from "@/pages/PlaylistPage"

import MainLayout from "@/layouts/MainLayout"
import ProtectedRoute from "@/routes/ProtectedRoute"
import ProfilePage from "@/pages/ProfilePage"

function App() {
  return (
    <Routes>

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/video/:id" element={<VideoPlayer />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >

        <Route path="/home" element={<Home />} />

        <Route path="/upload" element={<Upload />} />

        <Route path="/s3-import" element={<S3Import />} />

        <Route path="/favorites" element={<FavouritesPage />} />

        <Route path="/playlists" element={<PlaylistPage />} />
        <Route path="/profile" element={<ProfilePage />} />

      </Route>

    </Routes>
  )
}

export default App