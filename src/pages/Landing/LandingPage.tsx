import { Navigate } from 'react-router-dom'
import { BootScreen } from '../../components/pixel/BootScreen'
import { useAuth } from '../../context/AuthContext'

export function LandingPage() {
  const {
    signIn,
    startPhoneSignIn,
    confirmPhoneSignIn,
    cancelPhoneSignIn,
    phoneCodeSent,
    phoneHint,
    loading,
    error,
    configured,
    profile,
    user,
    returningFromGoogle,
  } = useAuth()

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
      onSendPhoneCode={(phone) => void startPhoneSignIn(phone)}
      onConfirmPhoneCode={(code) => void confirmPhoneSignIn(code)}
      onCancelPhone={cancelPhoneSignIn}
      phoneCodeSent={phoneCodeSent}
      phoneHint={phoneHint}
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
