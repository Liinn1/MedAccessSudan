import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { CalendarIcon, GlobeIcon, HomeIcon, ProfileIcon, StethoscopeIcon, VisitIcon } from '../icons/PatientHomeIcons'
import { DashboardNavigationShell } from './DashboardNavigationShell'

interface PatientNavigationShellProps {
  activeSection?: 'dashboard' | 'book' | 'homeVisit' | 'appointments' | 'profile'
  isLoggingOut: boolean
  onAppointments: () => void
  onDashboard: () => void
  onLogout: () => void
  onProfile: () => void
  user?: AuthenticatedUser | null
}

export function PatientNavigationShell({ activeSection = 'dashboard', isLoggingOut, onAppointments, onDashboard, onLogout, onProfile, user }: PatientNavigationShellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <DashboardNavigationShell
      closeLabel={t('patient.navigation.close')}
      contactSupportLabel={t('patient.navigation.contactSupport')}
      helpDescription={t('patient.navigation.helpDescription')}
      helpTitle={t('patient.navigation.helpTitle')}
      isLoggingOut={isLoggingOut}
      items={[
        { key: 'dashboard', active: activeSection === 'dashboard', icon: HomeIcon, label: t('patient.navigation.dashboard'), onSelect: onDashboard },
        { key: 'book', active: activeSection === 'book', icon: StethoscopeIcon, label: t('patient.navigation.book'), onSelect: () => navigate('/patient/doctors/search') },
        { key: 'home-visit', active: activeSection === 'homeVisit', icon: VisitIcon, label: t('patient.navigation.homeVisit'), onSelect: () => navigate('/patient/home-visits') },
        { key: 'appointments', active: activeSection === 'appointments', icon: CalendarIcon, label: t('patient.navigation.appointments'), onSelect: onAppointments },
        { key: 'profile', active: activeSection === 'profile', icon: ProfileIcon, label: t('patient.navigation.profile'), onSelect: onProfile },
        { key: 'public-home', active: false, icon: GlobeIcon, label: t('patient.navigation.publicHome'), onSelect: () => navigate('/') },
      ]}
      loggingOutLabel={t('patient.home.loggingOut')}
      logoutLabel={t('patient.home.logout')}
      menuLabel={t('patient.navigation.menu')}
      mobileLabel={t('patient.navigation.mobileLabel')}
      navigationLabel={t('patient.navigation.label')}
      onLogout={onLogout}
      roleLabel={t('roles.patient')}
      supportComingSoon={t('patient.navigation.supportComingSoon')}
      user={user}
    />
  )
}
