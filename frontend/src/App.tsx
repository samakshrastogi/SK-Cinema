import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Upload from "@/pages/Upload";
import VideoPlayer from "@/pages/VideoPlayer";
import S3Import from "@/pages/S3Import";
import OAuthSuccess from "@/pages/OAuthSuccess";
import ResetPassword from "@/pages/ResetPassword";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />

      {/* Google OAuth Redirect Handler */}
      <Route path="/oauth-success" element={<OAuthSuccess />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/video/:id" element={<VideoPlayer />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Home />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Upload />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/s3-import"
        element={
          <ProtectedRoute>
            <MainLayout>
              <S3Import />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;