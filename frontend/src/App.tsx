import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/features/websocket/useWebSocket'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

// Public pages
import HomePage from '@/pages/public/HomePage'
import AlertsPage from '@/pages/public/AlertsPage'
import SupportPage from '@/pages/public/SupportPage'
import StatsPage from '@/pages/public/StatsPage'
import LoginPage from '@/pages/public/LoginPage'
import RegisterPage from '@/pages/public/RegisterPage'
import VerifyEmailPage from '@/pages/public/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/public/ResetPasswordPage'

// Dashboard
import RoleDashboard from '@/pages/dashboard/RoleDashboard'

// Auth guard
import AuthGuard from '@/features/auth/AuthGuard'

export default function App() {
  // Read state directly — avoids Zustand persist rehydration losing methods
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const loggedIn = !!user && !!accessToken

  useWebSocket()
  useOnlineStatus()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={loggedIn ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={loggedIn ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={loggedIn ? <Navigate to="/dashboard" /> : <ResetPasswordPage />} />

      {/* Protected dashboard */}
      <Route path="/dashboard/*" element={
        <AuthGuard>
          <RoleDashboard />
        </AuthGuard>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
