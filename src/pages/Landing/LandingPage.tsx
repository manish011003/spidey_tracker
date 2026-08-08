import { Navigate } from 'react-router-dom'
import { BootScreen } from '../../components/pixel/BootScreen'
import { useAuth } from '../../context/AuthContext'

export function LandingPage() {
  const { signIn, loading, error, configured, profile, user, returningFromGoogle } = useAuth()

  // After Google redirect / popup, leave the boot screen automatically
  if (!loading && user && profile) {
    return (
      <Navigate
        to={profile.onboardingComplete ? '/tracker' : '/onboarding'}
        replace
      />
    )
  }

  return (
    <BootScreen
      onSignIn={() => void signIn()}
      loading={loading}
      error={error}
      configured={configured}
      skipAnimation={
        Boolean(profile?.preferences.skipBootAnimation) || returningFromGoogle
      }
      statusLabel={returningFromGoogle ? 'RETURNING FROM GOOGLE...' : undefined}
    />
  )
}
