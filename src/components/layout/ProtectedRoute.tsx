import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PixelLoader } from '../pixel/PixelLoader'

type Props = {
  requireOnboardingComplete?: boolean
  requireIncompleteOnboarding?: boolean
}

export function ProtectedRoute({
  requireOnboardingComplete,
  requireIncompleteOnboarding,
}: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--spidey-bg)' }}>
        <PixelLoader label="CONTACTING SPIDER NETWORK..." />
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/" replace />

  if (requireIncompleteOnboarding && profile.onboardingComplete) {
    return <Navigate to="/tracker" replace />
  }

  if (requireOnboardingComplete && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
