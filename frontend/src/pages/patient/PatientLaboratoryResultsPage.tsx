import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryIcon } from '../../components/icons/PatientHomeIcons'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { downloadLaboratoryResult, getPatientLaboratoryOrders, openLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'

export function PatientLaboratoryResultsPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const arabic = i18n.language.startsWith('ar')
  const [orders, setOrders] = useState<LaboratoryOrder[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()
    getPatientLaboratoryOrders(controller.signal).then((data) => {
      setOrders(data.filter((order) => order.status === 'result_ready' && order.result))
      setState('success')
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [navigate])

  if (state === 'loading') return <PatientLayout><LoadingState contained message={t('patient.laboratory.resultsLoading')} /></PatientLayout>
  if (state === 'error') return <PatientLayout><ErrorState contained message={t('patient.laboratory.resultsError')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /></PatientLayout>

  return <PatientLayout>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-[var(--color-primary)]">{t('patient.laboratory.resultsEyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('patient.laboratory.results')}</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('patient.laboratory.resultsDescription')}</p>
      </header>
      {orders.length === 0 ? <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6"><DashboardEmptyState action={<button className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => navigate('/patient/laboratory')} type="button">{t('patient.laboratory.findCta')}</button>} description={t('patient.laboratory.emptyResultsHelp')} icon={LaboratoryIcon} title={t('patient.laboratory.emptyResults')} /></div> : <ul className="mt-6 grid gap-3">{orders.map((order) => (
        <li className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={order.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-extrabold">{order.laboratory_name}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.date')}: {new Date(order.requested_at).toLocaleDateString(arabic ? 'ar-SD' : 'en')}</p>
            </div>
            <LaboratoryStatusBadge namespace="patient.laboratory.statuses" status={order.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.view')}</button>
            <button className="rounded-full border border-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary)]" onClick={() => downloadLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.download')}</button>
          </div>
        </li>
      ))}</ul>}
    </div>
  </PatientLayout>
}
