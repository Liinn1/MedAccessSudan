import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { resolvePatientNavSection } from '../../utils/patientNav'
import { CalendarIcon, GlobeIcon, HomeIcon, LaboratoryIcon, ProfileIcon, StethoscopeIcon, VisitIcon } from '../icons/PatientHomeIcons'
import { DashboardNavigationShell } from './DashboardNavigationShell'

interface PatientNavigationShellProps {
  activeSection?: 'dashboard' | 'book' | 'homeVisit' | 'appointments' | 'laboratory' | 'profile'
  isLoggingOut: boolean
  onAppointments: () => void
  onDashboard: () => void
  onLogout: () => void
  onProfile: () => void
  user?: AuthenticatedUser | null
}

export function PatientNavigationShell({ isLoggingOut, onAppointments, onDashboard, onLogout, onProfile, user }: PatientNavigationShellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const current = resolvePatientNavSection(useLocation().pathname)

  return (
    <DashboardNavigationShell
      closeLabel={t('patient.navigation.close')}
      contactSupportLabel={t('patient.navigation.contactSupport')}
      helpDescription={t('patient.navigation.helpDescription')}
      helpTitle={t('patient.navigation.helpTitle')}
      isLoggingOut={isLoggingOut}
      items={[
        { key: 'dashboard', active: current === 'dashboard', icon: HomeIcon, label: t('patient.navigation.dashboard'), onSelect: onDashboard },
        { key: 'book', active: current === 'book', icon: StethoscopeIcon, label: t('patient.navigation.book'), onSelect: () => navigate('/patient/doctors/search') },
        { key: 'home-visit', active: current === 'homeVisit', icon: VisitIcon, label: t('patient.navigation.homeVisit'), onSelect: () => navigate('/patient/home-visits') },
        { key: 'appointments', active: current === 'appointments', icon: CalendarIcon, label: t('patient.navigation.appointments'), onSelect: onAppointments },
        { key: 'laboratory', active: current === 'laboratory', icon: LaboratoryIcon, label: t('patient.navigation.laboratory'), onSelect: () => navigate('/patient/laboratory') },
        { key: 'profile', active: current === 'profile', icon: ProfileIcon, label: t('patient.navigation.profile'), onSelect: onProfile },
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
