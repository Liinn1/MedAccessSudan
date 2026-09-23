import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageBackgroundDecorations } from '../components/layout/PageBackgroundDecorations'
import { DashboardNavigationShell } from '../components/navigation/DashboardNavigationShell'
import { CalendarIcon, GlobeIcon, HomeIcon, ProfileIcon, StethoscopeIcon } from '../components/icons/PatientHomeIcons'
import { PublicFooter } from '../components/public/PublicFooter'
import { logout, type AuthenticatedUser } from '../services/authService'
import { getDoctorDashboard } from '../services/doctorDashboardService'

interface DoctorLayoutProps {
  activeSection?: 'dashboard' | 'appointments' | 'availability' | 'profile'
  children: ReactNode
  isLoggingOut?: boolean
  onAppointments?: () => void
  onAvailability?: () => void
  onDashboard?: () => void
  onLogout?: () => void
  onProfile?: () => void
  roleLabel?: string
  showFooter?: boolean
  user?: AuthenticatedUser | null
}

let cachedDoctorUser: AuthenticatedUser | null = null

export function DoctorLayout({
  activeSection = 'dashboard',
  children,
  isLoggingOut,
  onAppointments,
  onAvailability,
  onDashboard,
  onLogout,
  onProfile,
  roleLabel,
  showFooter = true,
  user,
}: DoctorLayoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loadedUser, setLoadedUser] = useState<AuthenticatedUser | null>(cachedDoctorUser)
  const [internalLoggingOut, setInternalLoggingOut] = useState(false)
  const shellUser = user ?? loadedUser

  useEffect(() => {
    if (user) {
      cachedDoctorUser = user
      return
    }
    if (cachedDoctorUser) return
    const controller = new AbortController()
    getDoctorDashboard(controller.signal)
      .then(({ profile, user: currentUser }) => {
        const doctorUser = { ...currentUser, profile_image_url: profile?.profile_image_url ?? currentUser.profile_image_url }
        cachedDoctorUser = doctorUser
        setLoadedUser(doctorUser)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [user])

  async function defaultLogout() {
    setInternalLoggingOut(true)
    try {
      await logout()
      cachedDoctorUser = null
      navigate('/login', { replace: true })
    } catch {
      setInternalLoggingOut(false)
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--color-background)]">
      <DashboardNavigationShell
        closeLabel={t('doctor.navigation.close')}
        contactSupportLabel={t('patient.navigation.contactSupport')}
        helpDescription={t('patient.navigation.helpDescription')}
        helpTitle={t('patient.navigation.helpTitle')}
        isLoggingOut={isLoggingOut ?? internalLoggingOut}
        items={[
          { key: 'dashboard', active: activeSection === 'dashboard', icon: HomeIcon, label: t('doctor.navigation.dashboard'), onSelect: onDashboard ?? (() => navigate('/doctor/dashboard')) },
          { key: 'appointments', active: activeSection === 'appointments', icon: CalendarIcon, label: t('doctor.navigation.appointments'), onSelect: onAppointments ?? (() => navigate('/doctor/appointments')) },
          { key: 'availability', active: activeSection === 'availability', icon: StethoscopeIcon, label: t('doctor.navigation.availability'), onSelect: onAvailability ?? (() => navigate('/doctor/availability')) },
          { key: 'profile', active: activeSection === 'profile', icon: ProfileIcon, label: t('doctor.navigation.profile'), onSelect: onProfile ?? (() => navigate('/doctor/profile')) },
          { key: 'public-home', active: false, icon: GlobeIcon, label: t('doctor.navigation.home'), onSelect: () => navigate('/') },
        ]}
        loggingOutLabel={t('doctor.dashboard.loggingOut')}
        logoutLabel={t('doctor.dashboard.logout')}
        menuLabel={t('doctor.navigation.menu')}
        mobileLabel={t('doctor.navigation.mobileLabel')}
        navigationLabel={t('doctor.navigation.label')}
        onLogout={onLogout ?? defaultLogout}
        roleLabel={roleLabel ?? t('roles.doctor')}
        supportComingSoon={t('patient.navigation.supportComingSoon')}
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
