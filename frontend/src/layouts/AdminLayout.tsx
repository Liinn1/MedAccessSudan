import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageBackgroundDecorations } from '../components/layout/PageBackgroundDecorations'
import { DashboardNavigationShell } from '../components/navigation/DashboardNavigationShell'
import { BellIcon, GlobeIcon, HomeIcon, InboxIcon, MailIcon, ProfileIcon, StethoscopeIcon } from '../components/icons/PatientHomeIcons'
import { InformationDialog } from '../components/feedback/InformationDialog'
import { PublicFooter } from '../components/public/PublicFooter'
import { logout, type AuthenticatedUser } from '../services/authService'

export type AdminSectionKey = 'dashboard' | 'users' | 'verification' | 'inquiries' | 'requests' | 'profile'

export function AdminLayout({
  active,
  children,
  onNavigate,
  user,
}: {
  active: AdminSectionKey
  children: ReactNode
  onNavigate: (section: AdminSectionKey, extra?: { requestTab?: 'locations' | 'tests' }) => void
  user: AuthenticatedUser | null
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [adsOpen, setAdsOpen] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout(); navigate('/admin/login', { replace: true }) }
    catch { setLoggingOut(false) }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--color-background)]">
      <DashboardNavigationShell
        closeLabel={t('admin.navigation.close')}
        contactSupportLabel={t('patient.navigation.contactSupport')}
        helpDescription={t('admin.helpDescription')}
        helpTitle={t('admin.helpTitle')}
        isLoggingOut={loggingOut}
        items={[
          { key: 'dashboard', active: active === 'dashboard', icon: HomeIcon, label: t('admin.navigation.dashboard'), onSelect: () => onNavigate('dashboard') },
          { key: 'verification', active: active === 'verification', icon: StethoscopeIcon, label: t('admin.navigation.verification'), onSelect: () => onNavigate('verification') },
          { key: 'requests', active: active === 'requests', icon: InboxIcon, label: t('admin.navigation.requests'), onSelect: () => onNavigate('requests') },
          { key: 'inquiries', active: active === 'inquiries', icon: MailIcon, label: t('admin.navigation.inquiries'), onSelect: () => onNavigate('inquiries') },
          { key: 'users', active: active === 'users', icon: ProfileIcon, label: t('admin.navigation.users'), onSelect: () => onNavigate('users') },
          { key: 'advertising', active: false, icon: BellIcon, label: t('admin.navigation.advertising'), onSelect: () => setAdsOpen(true) },
          { key: 'profile', active: active === 'profile', icon: ProfileIcon, label: t('admin.navigation.profile'), onSelect: () => onNavigate('profile') },
          { key: 'public-home', active: false, icon: GlobeIcon, label: t('admin.navigation.home'), onSelect: () => navigate('/') },
        ]}
        loggingOutLabel={t('admin.logout')}
        logoutLabel={t('admin.logout')}
        menuLabel={t('admin.navigation.open')}
        mobileLabel={t('admin.navigation.label')}
        navigationLabel={t('admin.navigation.label')}
        onLogout={handleLogout}
        roleLabel={user ? t(`roles.${user.role}`) : t('roles.admin')}
        user={user}
      />
      <main className="page-enter relative isolate min-h-[calc(100dvh-4rem)] lg:ms-64">
        <PageBackgroundDecorations />
        <div className="relative z-10">{children}</div>
      </main>
      <div className="lg:ms-64"><PublicFooter /></div>
      <InformationDialog
        closeLabel={t('admin.navigation.close')}
        description={t('admin.advertising.comingLater')}
        onClose={() => setAdsOpen(false)}
        open={adsOpen}
        title={t('admin.navigation.advertising')}
      />
    </div>
  )
}
