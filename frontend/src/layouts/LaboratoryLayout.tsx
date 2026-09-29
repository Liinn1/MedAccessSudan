import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageBackgroundDecorations } from '../components/layout/PageBackgroundDecorations'
import { DashboardNavigationShell } from '../components/navigation/DashboardNavigationShell'
import { CalendarIcon, GlobeIcon, HomeIcon, LaboratoryIcon, ProfileIcon } from '../components/icons/PatientHomeIcons'
import { PublicFooter } from '../components/public/PublicFooter'
import { logout, type AuthenticatedUser } from '../services/authService'
import { getLaboratoryDashboard } from '../services/laboratoryService'

interface LaboratoryLayoutProps {
  activeSection?: 'dashboard' | 'catalog' | 'requests' | 'results' | 'profile'
  children: ReactNode
  isLoggingOut?: boolean
  onLogout?: () => void
  showFooter?: boolean
  user?: AuthenticatedUser | null
}

let cachedLaboratoryUser: AuthenticatedUser | null = null

export function LaboratoryLayout({
  activeSection = 'dashboard',
  children,
  isLoggingOut,
  onLogout,
  showFooter = true,
  user,
}: LaboratoryLayoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loadedUser, setLoadedUser] = useState<AuthenticatedUser | null>(cachedLaboratoryUser)
  const [internalLoggingOut, setInternalLoggingOut] = useState(false)
  const shellUser = user ?? loadedUser

  useEffect(() => {
    if (user) {
      cachedLaboratoryUser = user
      return
    }
    if (cachedLaboratoryUser) return
    const controller = new AbortController()
    getLaboratoryDashboard(controller.signal)
      .then(({ profile, user: currentUser }) => {
        const next = { ...currentUser, profile_image_url: profile.profile_image_url ?? currentUser.profile_image_url }
        cachedLaboratoryUser = next
        setLoadedUser(next)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [user])

  async function defaultLogout() {
    setInternalLoggingOut(true)
    try {
      await logout()
      cachedLaboratoryUser = null
      navigate('/login', { replace: true })
    } catch {
      setInternalLoggingOut(false)
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--color-background)]">
      <DashboardNavigationShell
        closeLabel={t('laboratory.navigation.close')}
        contactSupportLabel={t('patient.navigation.contactSupport')}
        helpDescription={t('patient.navigation.helpDescription')}
        helpTitle={t('patient.navigation.helpTitle')}
        isLoggingOut={isLoggingOut ?? internalLoggingOut}
        items={[
          { key: 'dashboard', active: activeSection === 'dashboard', icon: HomeIcon, label: t('laboratory.navigation.dashboard'), onSelect: () => navigate('/laboratory/dashboard') },
          { key: 'catalog', active: activeSection === 'catalog', icon: LaboratoryIcon, label: t('laboratory.navigation.catalog'), onSelect: () => navigate('/laboratory/tests') },
          { key: 'requests', active: activeSection === 'requests', icon: CalendarIcon, label: t('laboratory.navigation.requests'), onSelect: () => navigate('/laboratory/requests') },
          { key: 'results', active: activeSection === 'results', icon: LaboratoryIcon, label: t('laboratory.navigation.results'), onSelect: () => navigate('/laboratory/results') },
          { key: 'profile', active: activeSection === 'profile', icon: ProfileIcon, label: t('laboratory.navigation.profile'), onSelect: () => navigate('/laboratory/profile') },
          { key: 'public-home', active: false, icon: GlobeIcon, label: t('laboratory.navigation.home'), onSelect: () => navigate('/') },
        ]}
        loggingOutLabel={t('laboratory.dashboard.loggingOut')}
        logoutLabel={t('laboratory.dashboard.logout')}
        menuLabel={t('laboratory.navigation.menu')}
        mobileLabel={t('laboratory.navigation.mobileLabel')}
        navigationLabel={t('laboratory.navigation.label')}
        onLogout={onLogout ?? defaultLogout}
        roleLabel={t('roles.laboratory')}
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
