import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ProfilePanel } from '../../components/profile/ProfilePanel'
import { useLocationSharing } from '../../hooks/useLocationSharing'
import { useState } from 'react'

/** Settings route opens the profile panel as a full dedicated view. */
export function SettingsPage() {
  const { profile, signOut } = useAuth()
  const location = useLocationSharing(profile?.uid, profile?.preferences)
  const [open, setOpen] = useState(true)

  if (!profile) return <Navigate to="/" replace />
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />

  if (!open) return <Navigate to="/tracker" replace />

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spidey-bg)' }}>
      <ProfilePanel
        open={open}
        profile={profile}
        onClose={() => setOpen(false)}
        onSignOut={() => {
          void signOut()
        }}
        onOpenPartnerLink={() => setOpen(false)}
        sharing={location.sharing}
        precise={location.precise}
        onToggleSharing={(v) => void location.setSharing(v)}
        onTogglePrecise={(v) => void location.setPrecise(v)}
      />
    </div>
  )
}
