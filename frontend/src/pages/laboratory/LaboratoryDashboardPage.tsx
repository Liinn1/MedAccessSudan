import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LaboratoryActivityChart } from '../../components/charts/LaboratoryActivityChart'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { DashboardPage } from '../../components/dashboard/DashboardPage'
import { DashboardSectionCard, DashboardSplit } from '../../components/dashboard/DashboardSectionCard'
import { DashboardStatCard, DashboardStatsGrid } from '../../components/dashboard/DashboardStatCard'
import { DashboardWelcome } from '../../components/dashboard/DashboardWelcome'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LaboratoryIcon, StethoscopeIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
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
  const viewAll = <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => navigate('/laboratory/requests')} type="button">{t('laboratory.dashboard.viewAll')}</button>

  return <LaboratoryLayout user={{ ...data.user, profile_image_url: data.profile.profile_image_url ?? data.user.profile_image_url }}>
    <DashboardPage>
      <DashboardWelcome description={t('laboratory.dashboard.description')} eyebrow={t('laboratory.dashboard.eyebrow')} greeting={t(`laboratory.dashboard.greetings.${greetingPeriod()}`)} title={data.profile.name} />
      <DashboardStatsGrid label={t('laboratory.dashboard.metricsLabel')}>
        <DashboardStatCard hint={t('laboratory.dashboard.pendingHint')} icon={CalendarIcon} label={t('laboratory.dashboard.pending')} tone="pending" value={data.summary.pending_requests} />
        <DashboardStatCard hint={t('laboratory.dashboard.inProgressHint')} icon={StethoscopeIcon} label={t('laboratory.dashboard.inProgress')} tone="info" value={data.summary.in_progress} />
        <DashboardStatCard hint={t('laboratory.dashboard.resultsHint')} icon={LaboratoryIcon} label={t('laboratory.dashboard.resultsReady')} tone="ready" value={data.summary.results_ready} />
        <DashboardStatCard hint={t('laboratory.dashboard.testsHint')} icon={LaboratoryIcon} label={t('laboratory.dashboard.testsOffered')} tone="accent" value={data.summary.tests_offered} />
      </DashboardStatsGrid>

      <DashboardSplit primary>
        <DashboardSectionCard action={viewAll} title={t('laboratory.dashboard.recent')}>
          {data.recent_requests.length === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyRecentHelp')} icon={CalendarIcon} title={t('laboratory.dashboard.emptyRecent')} /> : <ul className="mt-3 space-y-2.5">{data.recent_requests.map((order) => (
            <li key={order.id}><button className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200 sm:flex-row sm:items-center sm:justify-between" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">
              <span className="min-w-0"><span className="block font-extrabold">{order.patient?.name}</span><span className="mt-0.5 block truncate text-sm text-[var(--color-text-secondary)]" dir="auto">{testNames(order, arabic)}</span><span className="direction-ltr mt-1 block text-start text-xs font-semibold text-[var(--color-text-secondary)]">{formatRequestWhen(order.requested_at, locale)}</span></span>
              <LaboratoryStatusBadge status={order.status} />
            </button></li>
          ))}</ul>}
        </DashboardSectionCard>
        <DashboardSectionCard title={t('laboratory.dashboard.awaiting')}>
          {data.awaiting_results.length === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyAwaitingHelp')} icon={LaboratoryIcon} title={t('laboratory.dashboard.emptyAwaiting')} /> : <ul className="mt-3 space-y-2.5">{data.awaiting_results.map((order) => (
            <li key={order.id}><button className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-border)] p-3.5 text-start hover:border-teal-200" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">
              <span className="flex items-start justify-between gap-2"><span className="min-w-0 truncate font-extrabold" dir="auto">{testNames(order, arabic)}</span><LaboratoryStatusBadge status={order.status} /></span>
              <span className="text-sm text-[var(--color-text-secondary)]">{order.patient?.name}</span>
              <span className="text-sm font-bold text-[var(--color-primary)]">{t(awaitingActionKey(order.status))}</span>
            </button></li>
          ))}</ul>}
        </DashboardSectionCard>
      </DashboardSplit>

      <DashboardSplit>
        <DashboardSectionCard description={t('laboratory.dashboard.activityPeriod')} title={t('laboratory.dashboard.activity')}>
          {activityTotal === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyActivityHelp')} icon={CalendarIcon} title={t('laboratory.dashboard.emptyActivity')} /> : <div className="mt-3"><LaboratoryActivityChart days={data.request_activity.map((day) => ({ ...day, label: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(`${day.date}T12:00:00`)) }))} label={t('laboratory.dashboard.activity')} /></div>}
        </DashboardSectionCard>
        <DashboardSectionCard title={t('laboratory.dashboard.catalog')}>
          {data.summary.tests_offered === 0 && data.summary.tests_unavailable === 0 ? <DashboardEmptyState description={t('laboratory.dashboard.emptyCatalogHelp')} icon={LaboratoryIcon} title={t('laboratory.dashboard.emptyCatalog')} /> : <>
            <p className="mt-3 text-sm font-bold">{t('laboratory.dashboard.catalogActive', { count: data.summary.tests_offered })}</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('laboratory.dashboard.catalogUnavailable', { count: data.summary.tests_unavailable })}</p>
            {data.catalog_categories.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{data.catalog_categories.map((category) => <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2" key={category.name_en}><span className="font-semibold">{arabic ? category.name_ar : category.name_en}</span><span className="direction-ltr font-extrabold tabular-nums">{category.count}</span></li>)}</ul>}
          </>}
          <button className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white" onClick={() => navigate('/laboratory/tests')} type="button">{t('laboratory.dashboard.manageTests')}</button>
          {data.most_requested.length > 0 && <div className="mt-5 border-t border-[var(--color-border)] pt-4"><h3 className="text-sm font-extrabold">{t('laboratory.dashboard.mostRequested')}</h3><ul className="mt-2 space-y-1.5 text-sm">{data.most_requested.map((item) => <li className="flex items-center justify-between gap-3" key={`${item.name_en}-${item.count}`}><span className="min-w-0 truncate font-semibold" dir="auto">{arabic ? item.name_ar : item.name_en}{item.short_name ? ` (${item.short_name})` : ''}</span><span className="direction-ltr font-extrabold tabular-nums">{item.count}</span></li>)}</ul></div>}
        </DashboardSectionCard>
      </DashboardSplit>
    </DashboardPage>
  </LaboratoryLayout>
}
