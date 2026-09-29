import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { BookingPaymentSummary } from '../../components/booking/BookingPaymentSummary'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { downloadLaboratoryResult, formatLaboratoryPrice, getPatientLaboratoryOrder, openLaboratoryResult, type LaboratoryOrder, type LaboratoryOrderStatus } from '../../services/laboratoryService'

const timeline: LaboratoryOrderStatus[] = ['requested', 'sample_collected', 'in_progress', 'result_ready']

export function PatientLaboratoryOrderPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [order, setOrder] = useState<LaboratoryOrder | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const arabic = i18n.language.startsWith('ar')
  const locale = arabic ? 'ar-SD' : 'en'
  const id = Number(orderId)

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setState('error')
      return
    }
    const controller = new AbortController()
    getPatientLaboratoryOrder(id, controller.signal).then((data) => { setOrder(data); setState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) navigate('/patient/appointments', { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [attempt, id, navigate])

  if (state === 'loading') return <PatientLayout activeSection="appointments"><LoadingState contained message={t('patient.laboratory.loading')} /></PatientLayout>
  if (state === 'error' || !order) return <PatientLayout activeSection="appointments"><ErrorState contained message={t('patient.laboratory.detailError')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('laboratory.dashboard.retry')} /></PatientLayout>

  const currentIndex = timeline.indexOf(order.status)
  const location = order.location ? (arabic ? order.location.name_ar : order.location.name_en) : ''
  const imageResult = order.result?.mime_type.startsWith('image/')

  return <PatientLayout activeSection="appointments">
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
      <button className="font-bold text-[var(--color-primary)]" onClick={() => navigate('/patient/appointments')} type="button">← {t('patient.appointmentDetails.back')}</button>
      <header className="mt-4 rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-amber-700">{t('patient.laboratory.detailEyebrow')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">{order.reference}</h1><LaboratoryStatusBadge namespace="patient.laboratory.statuses" status={order.status} /></div>
      </header>
      <BookingPanel>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('patient.laboratory.laboratory')}</dt><dd className="mt-1 font-extrabold">{order.laboratory_name}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('patient.laboratory.location')}</dt><dd className="mt-1 font-semibold">{[location, order.address].filter(Boolean).join(' — ') || '—'}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('patient.laboratory.date')}</dt><dd className="mt-1 font-semibold">{new Date(order.requested_at).toLocaleString(locale)}</dd></div>
        </dl>
        <ol className="mt-6 flex flex-wrap gap-2">
          {timeline.map((status, index) => {
            const done = index < currentIndex
            const current = index === currentIndex
            return <li className={`rounded-full px-3 py-1 text-xs font-bold ${current ? 'bg-[var(--color-primary)] text-white' : done ? 'bg-[var(--color-success-surface)] text-emerald-800' : 'bg-slate-100 text-slate-500'}`} key={status}>
              {done ? '✓ ' : current ? '● ' : '○ '}
              {t(`patient.laboratory.statuses.${status}`)}
            </li>
          })}
        </ol>
        <h2 className="mt-6 font-extrabold">{t('patient.laboratory.tests')}</h2>
        <ul className="mt-3 space-y-2">{(order.items ?? []).map((item) => <li className="flex justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3" key={item.id}><span className="font-bold">{arabic ? item.name_ar : item.name_en}</span><span className="font-semibold">{formatLaboratoryPrice(item.price, item.currency, locale)}</span></li>)}</ul>
        <p className="mt-4 text-end text-lg font-extrabold">{t('patient.laboratory.total')}: {formatLaboratoryPrice(order.total, order.currency, locale)}</p>
        <BookingPaymentSummary payment={order.payment} />
        {order.status === 'result_ready' && order.result && <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{imageResult ? t('patient.laboratory.viewImage') : t('patient.laboratory.view')}</button>
          <button className="rounded-full border border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)]" onClick={() => downloadLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.download')}</button>
          <button className="rounded-full border border-[var(--color-border)] px-5 py-3 font-bold" onClick={() => navigate('/patient/lab-results')} type="button">{t('patient.laboratory.results')}</button>
        </div>}
      </BookingPanel>
    </div>
  </PatientLayout>
}
