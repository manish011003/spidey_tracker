import { BootScreen } from '../../components/pixel/BootScreen'
import { useAuth } from '../../context/AuthContext'

export function LandingPage() {
  const { signIn, loading, error, configured, profile } = useAuth()

  return (
    <BootScreen
      onSignIn={() => void signIn()}
      loading={loading}
      error={error}
      configured={configured}
      skipAnimation={profile?.preferences.skipBootAnimation}
    />
  )
}
