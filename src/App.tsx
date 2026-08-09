import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LandingPage } from './pages/Landing/LandingPage'
import { OnboardingPage } from './pages/Onboarding/OnboardingPage'
import { TrackerPage } from './pages/Tracker/TrackerPage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { PixelLoader } from './components/pixel/PixelLoader'
import { IntroCinematic } from './components/pixel/IntroCinematic'

function RootRedirect() {
  const { user, profile, loading, configured } = useAuth()

  if (!configured) return <LandingPage />
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--spidey-bg)' }}>
        <PixelLoader label="INITIALIZING SYSTEM..." />
      </div>
    )
  }
  if (!user || !profile) return <LandingPage />
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />
  return <Navigate to="/tracker" replace />
}

export default function App() {
  return (
    <IntroCinematic>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LandingPage />} />
            <Route element={<ProtectedRoute requireIncompleteOnboarding />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>
            <Route element={<ProtectedRoute requireOnboardingComplete />}>
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </IntroCinematic>
  )
}
