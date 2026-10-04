import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { AdminLayout, type AdminSectionKey } from '../../layouts/AdminLayout'
import { getAdminDashboard, type AdminAttentionItem, type AdminDashboardPayload } from '../../services/adminService'
import { isAbortError } from '../../services/apiClient'
import { clearSessionCache, restoreSession, type AuthenticatedUser } from '../../services/authService'
import { ADMIN_SECTION_PATHS } from '../../utils/navigation'
import { AdminInquiriesSection } from './sections/AdminInquiriesSection'
import { AdminOverviewSection } from './sections/AdminOverviewSection'
import { AdminProfileSection } from './sections/AdminProfileSection'
import { AdminRequestsSection } from './sections/AdminRequestsSection'
import { AdminUsersSection } from './sections/AdminUsersSection'
import { AdminVerificationSection } from './sections/AdminVerificationSection'

function sectionFromPath(pathname: string): AdminSectionKey {
  const match = (Object.entries(ADMIN_SECTION_PATHS) as [AdminSectionKey, string][]).find(([, path]) => path === pathname)
  return match?.[0] ?? 'dashboard'
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [auth, setAuth] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking')
  const [current, setCurrent] = useState<AuthenticatedUser | null>(null)
  const section = sectionFromPath(location.pathname)
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [requestTab, setRequestTab] = useState<'locations' | 'tests'>('locations')
  const [openVerificationId, setOpenVerificationId] = useState<number | null>(null)
  const [openInquiryId, setOpenInquiryId] = useState<number | null>(null)
  const [openLocationId, setOpenLocationId] = useState<number | null>(null)
  const [openTestId, setOpenTestId] = useState<number | null>(null)

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    setLoadingOverview(true)
    try { setDashboard(await getAdminDashboard(signal)) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError') && !isAbortError(error)) setDashboard(null) }
    finally { if (!signal?.aborted) setLoadingOverview(false) }
  }, [])

  useEffect(() => {
    let cancelled = false
    restoreSession()
      .then((user) => {
        if (cancelled) return
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
          setAuth('unauthenticated')
          return
        }
        setCurrent(user)
        setAuth('authenticated')
      })
      .catch(() => {
        if (!cancelled) setAuth('error')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (auth !== 'authenticated') return
    const controller = new AbortController()
    void loadOverview(controller.signal)
    return () => controller.abort()
  }, [auth, loadOverview])

  useEffect(() => {
    if (auth === 'unauthenticated') navigate('/admin/login', { replace: true })
  }, [auth, navigate])

  function navigateSection(next: AdminSectionKey, extra?: { requestTab?: 'locations' | 'tests' }) {
    if (extra?.requestTab) setRequestTab(extra.requestTab)
    const path = ADMIN_SECTION_PATHS[next]
    if (location.pathname !== path) navigate(path)
  }

  function openAttention(item: AdminAttentionItem) {
    if (item.kind === 'verification') { setOpenVerificationId(item.id); navigate(ADMIN_SECTION_PATHS.verification) }
    if (item.kind === 'inquiry') { setOpenInquiryId(item.id); navigate(ADMIN_SECTION_PATHS.inquiries) }
    if (item.kind === 'location') { setOpenLocationId(item.id); setRequestTab('locations'); navigate(ADMIN_SECTION_PATHS.requests) }
    if (item.kind === 'test') { setOpenTestId(item.id); setRequestTab('tests'); navigate(ADMIN_SECTION_PATHS.requests) }
  }

  if (auth === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-background)] px-5">
        <ErrorState
          message={t('admin.errors.load')}
          onRetry={() => {
            clearSessionCache()
            setAuth('checking')
            restoreSession()
              .then((user) => {
                if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                  setAuth('unauthenticated')
                  return
                }
                setCurrent(user)
                setAuth('authenticated')
              })
              .catch(() => setAuth('error'))
          }}
          retryLabel={t('admin.retry')}
        />
      </main>
    )
  }

  if (auth !== 'authenticated' || !current) {
    return <main className="grid min-h-screen place-items-center bg-[var(--color-background)]"><LoadingState message={t('admin.login.checkingSession')} /></main>
  }

  return (
    <AdminLayout active={section} onNavigate={(next, extra) => { navigateSection(next, extra); if (next === 'dashboard') void loadOverview() }} user={current}>
      {section === 'dashboard' && (
        <AdminOverviewSection
          data={dashboard}
          loading={loadingOverview}
          name={current.name}
          onNavigate={navigateSection}
          onOpenAttention={openAttention}
        />
      )}
      {section === 'users' && <AdminUsersSection />}
      {section === 'verification' && <AdminVerificationSection openId={openVerificationId} />}
      {section === 'inquiries' && <AdminInquiriesSection openId={openInquiryId} />}
      {section === 'requests' && <AdminRequestsSection onTabChange={setRequestTab} openLocationId={openLocationId} openTestId={openTestId} tab={requestTab} />}
      {section === 'profile' && <AdminProfileSection onUpdated={setCurrent} user={current} />}
    </AdminLayout>
  )
}
