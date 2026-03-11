import { Routes, Route, Navigate } from "react-router-dom";

import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Upload from "@/pages/Upload";
import VideoPlayer from "@/pages/VideoPlayer";
import S3Import from "@/pages/S3Import";
import OAuthSuccess from "@/pages/OAuthSuccess";
import ResetPassword from "@/pages/ResetPassword";

import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";

function App() {
  return (
    <Routes>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Video player (can be public if you want) */}
      <Route path="/video/:id" element={<VideoPlayer />} />

      {/* Protected routes */}
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

      </Route>

    </Routes>
  );
}

export default App;