import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageBackgroundDecorations } from '../components/layout/PageBackgroundDecorations'
import { PatientNavigationShell } from '../components/navigation/PatientNavigationShell'
import { PublicFooter } from '../components/public/PublicFooter'
import { getCurrentUser, logout, type AuthenticatedUser } from '../services/authService'

interface PatientLayoutProps {
  activeSection?: 'dashboard' | 'book' | 'homeVisit' | 'appointments' | 'profile'
  children: ReactNode
  isLoggingOut?: boolean
  onAppointments?: () => void
  onDashboard?: () => void
  onLogout?: () => void
  onProfile?: () => void
  showFooter?: boolean
  user?: AuthenticatedUser | null
}

let cachedPatientUser: AuthenticatedUser | null = null

export function PatientLayout({
  activeSection = 'dashboard',
  children,
  isLoggingOut,
  onAppointments,
  onDashboard,
  onLogout,
  onProfile,
  showFooter = true,
  user,
}: PatientLayoutProps) {
  const navigate = useNavigate()
  const [loadedUser, setLoadedUser] = useState<AuthenticatedUser | null>(cachedPatientUser)
  const [internalLoggingOut, setInternalLoggingOut] = useState(false)
  const shellUser = user ?? loadedUser

  useEffect(() => {
    if (user) {
      cachedPatientUser = user
      return
    }
    if (cachedPatientUser) return

    const controller = new AbortController()
    getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (currentUser.role !== 'patient') return
        cachedPatientUser = currentUser
        setLoadedUser(currentUser)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [user])

  async function defaultLogout() {
    setInternalLoggingOut(true)
    try {
      await logout()
      cachedPatientUser = null
      navigate('/login', { replace: true })
    } catch {
      setInternalLoggingOut(false)
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--color-background)]">
      <PatientNavigationShell
        activeSection={activeSection}
        isLoggingOut={isLoggingOut ?? internalLoggingOut}
        onAppointments={onAppointments ?? (() => navigate('/patient/appointments'))}
        onDashboard={onDashboard ?? (() => navigate('/patient/home'))}
        onLogout={onLogout ?? defaultLogout}
        onProfile={onProfile ?? (() => navigate('/patient/profile'))}
        user={shellUser}
      />
      <main className="page-enter relative isolate min-h-[calc(100dvh-4rem)] lg:ms-64">
        <PageBackgroundDecorations />
        <div className="relative z-10">{children}</div>
      </main>
      {showFooter && <div className="lg:ms-64"><PublicFooter /></div>}
    </div>
  )
}
