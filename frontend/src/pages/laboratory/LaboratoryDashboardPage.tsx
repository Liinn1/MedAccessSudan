import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LaboratoryActivityChart } from '../../components/charts/LaboratoryActivityChart'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { DashboardGreeting } from '../../components/dashboard/DashboardGreeting'
import { DashboardHomeCard, DashboardHomeGrid } from '../../components/dashboard/DashboardHomeCard'
import { DashboardInfoCard } from '../../components/dashboard/DashboardInfoCard'
import { DashboardPage } from '../../components/dashboard/DashboardPage'
import { DashboardProfileCard } from '../../components/dashboard/DashboardProfileCard'
import { DashboardQuickActionCard } from '../../components/dashboard/DashboardQuickActionCard'
import { DashboardSectionCard, DashboardSplit } from '../../components/dashboard/DashboardSectionCard'
import { DashboardServices } from '../../components/dashboard/DashboardServices'
import { DashboardStatCard, DashboardStatsGrid } from '../../components/dashboard/DashboardStatCard'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LaboratoryIcon, LocationIcon, MailIcon, PhoneIcon, ProfileIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { DashboardVerificationNotice } from '../../components/verification/ProviderVerificationCard'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getLaboratoryDashboard, type LaboratoryDashboardData, type LaboratoryOrder } from '../../services/laboratoryService'
import { greetingPeriod, SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath, LABORATORY_DASHBOARD_ROUTE } from '../../utils/navigation'

function testNames(order: LaboratoryOrder, arabic: boolean) {
  return (order.items ?? []).map((item) => (arabic ? item.name_ar : item.name_en)).join(', ')
}

function formatRequestWhen(iso: string, locale: string) {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = new Intl.DateTimeFormat('en', { timeZone: SUDAN_TIME_ZONE, dateStyle: 'short' }).format(date)
    === new Intl.DateTimeFormat('en', { timeZone: SUDAN_TIME_ZONE, dateStyle: 'short' }).format(now)
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(date)
  if (sameDay) return time
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(date)
}

function awaitingActionKey(status: LaboratoryOrder['status']) {
  if (status === 'in_progress') return 'laboratory.detail.upload'
  if (status === 'sample_collected') return 'laboratory.detail.markProgress'
  return 'laboratory.dashboard.open'
}

export function LaboratoryDashboardPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<LaboratoryDashboardData | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const arabic = i18n.language.startsWith('ar')
  const locale = arabic ? 'ar-SD' : 'en'

  useEffect(() => {
    const controller = new AbortController()
    getLaboratoryDashboard(controller.signal).then((payload) => { setData(payload); setState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath(LABORATORY_DASHBOARD_ROUTE), { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [attempt, navigate])

  if (state === 'loading') return <LaboratoryLayout><LoadingState contained message={t('laboratory.dashboard.loading')} /></LaboratoryLayout>
  if (state === 'error' || !data) return <LaboratoryLayout><ErrorState contained message={t('laboratory.dashboard.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('laboratory.dashboard.retry')} /></LaboratoryLayout>

  const activityTotal = data.request_activity.reduce((sum, day) => sum + day.count, 0)
  const pendingOrders = data.recent_requests.filter((order) => order.status !== 'result_ready')
  const locationName = data.profile.location ? (arabic ? data.profile.location.name_ar : data.profile.location.name_en) : '—'
  const viewAll = <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/laboratory/requests')} type="button">{t('laboratory.dashboard.viewAll')}</button>

  return <LaboratoryLayout user={{ ...data.user, profile_image_url: data.profile.profile_image_url ?? data.user.profile_image_url }}>
    <DashboardPage>
      <DashboardGreeting description={t('laboratory.dashboard.greetingSupport')} greeting={t(`laboratory.dashboard.greetings.${greetingPeriod()}`, { name: data.profile.name })} />
      <DashboardVerificationNotice onOpen={() => navigate('/laboratory/profile#account-verification')} role="laboratory" status={data.profile.verification_status} />

      <DashboardHomeGrid>
        <DashboardProfileCard editLabel={t('patient.dashboard.editProfile')} imageUrl={data.profile.profile_image_url ?? data.user.profile_image_url} name={data.profile.name} onEdit={() => navigate('/laboratory/profile')} role={t('roles.laboratory')} />
        <DashboardInfoCard
          editLabel={t('patient.dashboard.edit')}
          onEdit={() => navigate('/laboratory/profile')}
          rows={[
            { icon: <LocationIcon className="size-5" />, label: t('laboratory.profile.location'), value: locationName },
            { icon: <PhoneIcon className="size-5" />, label: t('laboratory.profile.phone'), value: data.profile.phone || data.user.phone || '—' },
            { icon: <MailIcon className="size-5" />, label: t('patient.dashboard.email'), value: data.user.email },
          ]}
          title={t('laboratory.dashboard.infoTitle')}
        />
        <DashboardHomeCard action={viewAll} icon={<CalendarIcon className="size-5 text-[var(--color-primary)]" />} title={t('laboratory.dashboard.recent')}>
          {pendingOrders.length === 0 ? <DashboardEmptyState action={<button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/laboratory/requests')} type="button">{t('laboratory.dashboard.viewRequests')}</button>} description={t('laboratory.dashboard.emptyRecentHelp')} title={t('laboratory.dashboard.emptyPendingTitle')} /> : <ul className="space-y-2.5">{pendingOrders.slice(0, 4).map((order) => (
            <li key={order.id}><button className="flex w-full flex-col gap-1 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">
              <span className="flex flex-wrap items-start justify-between gap-2"><strong>{order.patient?.name}</strong><LaboratoryStatusBadge status={order.status} /></span>
              <span className="truncate text-sm text-[var(--color-text-secondary)]" dir="auto">{testNames(order, arabic)}</span>
              <span className="direction-ltr text-start text-xs font-semibold text-[var(--color-text-secondary)]">{formatRequestWhen(order.requested_at, locale)}</span>
            </button></li>
          ))}</ul>}
        </DashboardHomeCard>
      </DashboardHomeGrid>

      <DashboardServices title={t('laboratory.dashboard.servicesTitle')}>
        <DashboardQuickActionCard accentClassName="bg-[var(--color-primary-surface)] text-[var(--color-primary)]" description={t('laboratory.dashboard.serviceDescriptions.catalog')} icon={<LaboratoryIcon className="size-5" />} label={t('laboratory.navigation.catalog')} onSelect={() => navigate('/laboratory/tests')} />
        <DashboardQuickActionCard accentClassName="bg-amber-100 text-amber-700" description={t('laboratory.dashboard.serviceDescriptions.requests')} icon={<CalendarIcon className="size-5" />} label={t('laboratory.navigation.requests')} onSelect={() => navigate('/laboratory/requests')} />
        <DashboardQuickActionCard accentClassName="bg-sky-100 text-sky-700" description={t('laboratory.dashboard.serviceDescriptions.results')} icon={<LaboratoryIcon className="size-5" />} label={t('laboratory.navigation.results')} onSelect={() => navigate('/laboratory/results')} />
        <DashboardQuickActionCard accentClassName="bg-slate-100 text-slate-700" description={t('laboratory.dashboard.serviceDescriptions.profile')} icon={<ProfileIcon className="size-5" />} label={t('laboratory.navigation.profile')} onSelect={() => navigate('/laboratory/profile')} />
      </DashboardServices>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold">{t('laboratory.dashboard.activity')}</h2>
        <DashboardStatsGrid label={t('laboratory.dashboard.metricsLabel')}>
          <DashboardStatCard hint={t('laboratory.dashboard.pendingHint')} icon={CalendarIcon} label={t('laboratory.dashboard.pending')} tone="pending" value={data.summary.pending_requests} />
          <DashboardStatCard hint={t('laboratory.dashboard.inProgressHint')} icon={LaboratoryIcon} label={t('laboratory.dashboard.inProgress')} tone="info" value={data.summary.in_progress} />
          <DashboardStatCard hint={t('laboratory.dashboard.resultsHint')} icon={LaboratoryIcon} label={t('laboratory.dashboard.resultsReady')} tone="ready" value={data.summary.results_ready} />
          <DashboardStatCard hint={t('laboratory.dashboard.testsHint')} icon={LaboratoryIcon} label={t('laboratory.dashboard.testsOffered')} tone="accent" value={data.summary.tests_offered} />
        </DashboardStatsGrid>
      </section>

      <DashboardSplit>
        <DashboardSectionCard title={t('laboratory.dashboard.awaiting')}>
          {data.awaiting_results.length === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyAwaitingHelp')} icon={LaboratoryIcon} title={t('laboratory.dashboard.emptyAwaiting')} /> : <ul className="space-y-2.5">{data.awaiting_results.map((order) => (
            <li key={order.id}><button className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">
              <span className="flex items-start justify-between gap-2"><span className="min-w-0 truncate font-extrabold" dir="auto">{testNames(order, arabic)}</span><LaboratoryStatusBadge status={order.status} /></span>
              <span className="text-sm text-[var(--color-text-secondary)]">{order.patient?.name}</span>
              <span className="text-sm font-bold text-[var(--color-primary)]">{t(awaitingActionKey(order.status))}</span>
            </button></li>
          ))}</ul>}
        </DashboardSectionCard>
        <DashboardSectionCard description={t('laboratory.dashboard.activityPeriod')} title={t('laboratory.dashboard.catalog')}>
          {activityTotal === 0 ? null : <div className="mb-4"><LaboratoryActivityChart days={data.request_activity.map((day) => ({ ...day, label: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(`${day.date}T12:00:00`)) }))} label={t('laboratory.dashboard.activity')} /></div>}
          {data.summary.tests_offered === 0 && data.summary.tests_unavailable === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyCatalogHelp')} icon={LaboratoryIcon} title={t('laboratory.dashboard.emptyCatalog')} /> : <>
            <p className="text-sm font-bold">{t('laboratory.dashboard.catalogActive', { count: data.summary.tests_offered })}</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('laboratory.dashboard.catalogUnavailable', { count: data.summary.tests_unavailable })}</p>
            <button className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white" onClick={() => navigate('/laboratory/tests')} type="button">{t('laboratory.dashboard.manageTests')}</button>
          </>}
        </DashboardSectionCard>
      </DashboardSplit>
    </DashboardPage>
  </LaboratoryLayout>
}
