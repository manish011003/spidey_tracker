import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { OnboardingFlow } from '../../components/onboarding/OnboardingFlow'
import { PixelLoader } from '../../components/pixel/PixelLoader'

export function OnboardingPage() {
  const { profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--spidey-bg)' }}>
        <PixelLoader label="CALIBRATING WEB SENSORS..." />
      </div>
    )
  }

  if (!profile) return <Navigate to="/" replace />
  if (profile.onboardingComplete) return <Navigate to="/tracker" replace />

  return (
    <OnboardingFlow
      profile={profile}
      onComplete={() => {
        void refreshProfile().then(() => navigate('/tracker', { replace: true }))
      }}
    />
  )
}
