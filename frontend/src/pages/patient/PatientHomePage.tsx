import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { DashboardPage } from '../../components/dashboard/DashboardPage'
import { DashboardQuickActionCard } from '../../components/dashboard/DashboardQuickActionCard'
import { DashboardSectionCard, DashboardSplit } from '../../components/dashboard/DashboardSectionCard'
import { DashboardStatCard, DashboardStatsGrid } from '../../components/dashboard/DashboardStatCard'
import { DashboardWelcome } from '../../components/dashboard/DashboardWelcome'
import { ErrorState } from '../../components/feedback/ErrorState'
import { InformationDialog } from '../../components/feedback/InformationDialog'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LaboratoryIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getPatientHome, logout, type AuthenticatedUser } from '../../services/authService'
import { downloadLaboratoryResult, getPatientLaboratoryOrders, openLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'
import { getPatientAppointments, type PatientAppointment } from '../../services/patientAppointmentService'
import { greetingPeriod, SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'

const services = [
  { key: 'findDoctor', path: '/patient/doctors/search', accent: 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]', icon: StethoscopeIcon },
  { key: 'homeVisit', path: '/patient/home-visits', accent: 'bg-amber-100 text-amber-600', icon: VisitIcon },
  { key: 'laboratory', path: '/patient/laboratory', accent: 'bg-sky-100 text-sky-600', icon: LaboratoryIcon },
  { key: 'appointments', path: '/patient/appointments', accent: 'bg-slate-100 text-slate-700', icon: CalendarIcon },
] as const

const healthTips = ['checkups', 'hydration', 'movement'] as const

export function PatientHomePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [futureFeature, setFutureFeature] = useState('')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [labOrders, setLabOrders] = useState<LaboratoryOrder[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTip, setActiveTip] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getPatientHome(controller.signal), getPatientAppointments(controller.signal), getPatientLaboratoryOrders(controller.signal)])
      .then(([authenticatedUser, patientAppointments, patientLabOrders]) => {
        setUser(authenticatedUser)
        setAppointments(patientAppointments)
        setLabOrders(patientLabOrders)
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath('/patient/home'), { replace: true })
        else setLoadState('error')
      })
    return () => controller.abort()
  }, [loadAttempt, navigate])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setFutureFeature(t('patient.home.logoutError'))
      setIsLoggingOut(false)
    }
  }

  if (loadState === 'loading') return <PatientLayout><LoadingState contained message={t('patient.dashboard.loading')} /></PatientLayout>
  if (loadState === 'error' || !user) return <PatientLayout><ErrorState contained message={t('patient.dashboard.loadError')} onRetry={() => { setLoadState('loading'); setLoadAttempt((attempt) => attempt + 1) }} retryLabel={t('patient.home.retry')} /></PatientLayout>

  const firstName = user.first_name || user.name.split(' ')[0] || user.name
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-SD' : 'en'
  const arabic = i18n.language.startsWith('ar')
  const upcomingAppointments = appointments.filter((appointment) => appointment.status === 'confirmed' && new Date(appointment.ends_at) >= new Date()).sort((first, second) => new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime())
  const completedCount = appointments.filter((appointment) => appointment.status === 'completed').length
  const pendingLabs = labOrders.filter((order) => order.status !== 'result_ready').length
  const tipKey = healthTips[activeTip]
  const viewAll = (path: string) => <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate(path)} type="button">{t('patient.dashboard.viewAll')}</button>

  return (
    <PatientLayout isLoggingOut={isLoggingOut} onAppointments={() => navigate('/patient/appointments')} onDashboard={() => navigate('/patient/home')} onLogout={handleLogout} onProfile={() => navigate('/patient/profile')} user={user}>
      <DashboardPage>
        <DashboardWelcome description={t('patient.dashboard.supportingText')} eyebrow={t('patient.dashboard.eyebrow')} greeting={t(`patient.dashboard.greetings.${greetingPeriod()}`)} title={`${firstName}!`} />
        <DashboardStatsGrid columns={3} label={t('patient.dashboard.overviewLabel')}>
          <DashboardStatCard hint={t('patient.dashboard.upcomingHint')} icon={CalendarIcon} label={t('patient.dashboard.upcomingAppointments')} tone="pending" value={upcomingAppointments.length} />
          <DashboardStatCard hint={t('patient.dashboard.labHint')} icon={LaboratoryIcon} label={t('patient.dashboard.labActivity')} tone="info" value={pendingLabs} />
          <DashboardStatCard hint={t('patient.dashboard.completedHint')} icon={StethoscopeIcon} label={t('patient.dashboard.completedAppointments')} tone="ready" value={completedCount} />
        </DashboardStatsGrid>

        <DashboardSplit primary>
          <DashboardSectionCard action={viewAll('/patient/appointments')} title={t('patient.dashboard.upcomingAppointments')}>
            {upcomingAppointments.length === 0 ? <DashboardEmptyState action={<button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/doctors/search')} type="button">{t('patient.dashboard.bookAppointment')}</button>} description={t('patient.dashboard.noUpcomingDescription')} icon={CalendarIcon} title={t('patient.dashboard.noUpcomingTitle')} /> : <ul className="mt-3 space-y-2.5">{upcomingAppointments.slice(0, 4).map((appointment) => {
              const startsAt = new Date(appointment.starts_at)
              const specialty = arabic ? appointment.doctor.specialization.name_ar : appointment.doctor.specialization.name_en
              return <li key={appointment.id}><button className="flex w-full flex-col gap-1 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/patient/appointments/${appointment.id}`)} type="button">
                <span className="flex flex-wrap items-start justify-between gap-2"><strong>{appointment.doctor.name}</strong><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{t(`patient.appointments.statuses.${appointment.status}`)}</span></span>
                <span className="text-sm text-[var(--color-text-secondary)]">{specialty} · {t(`patient.appointments.services.${appointment.service_type}`)}</span>
                <span className="direction-ltr text-start text-xs font-semibold text-[var(--color-text-secondary)]">{new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(startsAt)}</span>
              </button></li>
            })}</ul>}
          </DashboardSectionCard>

          <DashboardSectionCard action={viewAll('/patient/laboratory')} title={t('patient.dashboard.laboratory.title')}>
            {labOrders.length === 0 ? <DashboardEmptyState action={<button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/laboratory')} type="button">{t('patient.dashboard.laboratory.viewAll')}</button>} description={t('patient.dashboard.laboratory.emptyDescription')} icon={LaboratoryIcon} title={t('patient.dashboard.laboratory.emptyTitle')} /> : <ul className="mt-3 space-y-2.5">{labOrders.slice(0, 4).map((order) => <li className="rounded-2xl border border-[var(--color-border)] p-3.5" key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-extrabold" dir="auto">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</p><LaboratoryStatusBadge status={order.status} /></div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{order.laboratory_name}</p>
              <p className="direction-ltr mt-1 text-start text-xs font-semibold text-[var(--color-text-secondary)]">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(order.requested_at))}</p>
              {order.status === 'result_ready' && order.result && <div className="mt-2 flex flex-wrap gap-3"><button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.view')}</button><button className="text-sm font-bold text-[var(--color-primary)]" onClick={() => downloadLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.download')}</button></div>}
            </li>)}</ul>}
          </DashboardSectionCard>
        </DashboardSplit>

        <DashboardSectionCard className="mt-5 xl:mt-6" title={t('patient.dashboard.quickActions')}>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{services.map(({ key, path, accent, icon: Icon }) => <DashboardQuickActionCard accentClassName={accent} description={t(`patient.dashboard.serviceDescriptions.${key}`)} icon={<Icon className="size-5" />} key={key} label={t(`patient.home.services.${key}`)} onSelect={() => navigate(path)} />)}</div>
        </DashboardSectionCard>

        <DashboardSplit>
          <DashboardSectionCard action={<button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/patient/profile')} type="button">{t('patient.dashboard.editProfile')}</button>} title={t('patient.dashboard.profileSummary')}>
            <p className="mt-3 font-extrabold" dir="auto">{user.name}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{t('roles.patient')}</p>
            <dl className="mt-3 grid gap-3 text-sm">
              <div><dt className="text-xs font-bold text-[var(--color-text-secondary)]">{t('patient.dashboard.email')}</dt><dd className="mt-1 break-all font-semibold">{user.email}</dd></div>
              <div><dt className="text-xs font-bold text-[var(--color-text-secondary)]">{t('patient.dashboard.phone')}</dt><dd className="direction-ltr mt-1 text-start font-semibold">{user.phone || '—'}</dd></div>
            </dl>
          </DashboardSectionCard>
          <DashboardSectionCard action={<div className="flex gap-2"><button aria-label={t('patient.dashboard.healthTips.previous')} className="grid size-8 place-items-center rounded-full border border-[var(--color-border)] rtl:rotate-180" onClick={() => setActiveTip((current) => (current + healthTips.length - 1) % healthTips.length)} type="button">‹</button><button aria-label={t('patient.dashboard.healthTips.next')} className="grid size-8 place-items-center rounded-full border border-[var(--color-border)] rtl:rotate-180" onClick={() => setActiveTip((current) => (current + 1) % healthTips.length)} type="button">›</button></div>} title={t('patient.dashboard.healthTips.title')}>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`patient.dashboard.healthTips.items.${tipKey}`)}</p>
          </DashboardSectionCard>
        </DashboardSplit>
      </DashboardPage>
      <InformationDialog closeLabel={t('publicHome.footer.comingSoonClose')} description={futureFeature === t('patient.home.logoutError') ? futureFeature : t('publicHome.footer.comingSoonDescription', { feature: futureFeature })} onClose={() => setFutureFeature('')} open={Boolean(futureFeature)} title={futureFeature || t('publicHome.comingSoon')} />
    </PatientLayout>
  )
}
