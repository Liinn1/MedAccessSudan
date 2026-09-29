import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { downloadLaboratoryResult, getLaboratoryOrder, openLaboratoryResult, transitionLaboratoryOrder, uploadLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'

export function LaboratoryRequestDetailPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [order, setOrder] = useState<LaboratoryOrder | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const arabic = i18n.language.startsWith('ar')
  const id = Number(orderId)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    getLaboratoryOrder(id, controller.signal).then((data) => { setOrder(data); setState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) navigate('/laboratory/requests', { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [id, navigate])

  async function move(status: 'sample_collected' | 'in_progress') {
    if (!order) return
    setBusy(status)
    try { setOrder(await transitionLaboratoryOrder(order.id, status)); setMessage('') } catch { setMessage(t('laboratory.detail.uploadError')) }
    finally { setBusy('') }
  }

  async function onFile(file: File) {
    if (!order) return
    setBusy('upload')
    try {
      setOrder(await uploadLaboratoryResult(order.id, file))
      setMessage(t('laboratory.detail.uploaded'))
    } catch { setMessage(t('laboratory.detail.uploadError')) }
    finally { setBusy('') }
  }

  if (state === 'loading') return <LaboratoryLayout activeSection="requests"><LoadingState contained message={t('laboratory.detail.loading')} /></LaboratoryLayout>
  if (state === 'error' || !order) return <LaboratoryLayout activeSection="requests"><ErrorState contained message={t('laboratory.detail.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /></LaboratoryLayout>

  return <LaboratoryLayout activeSection="requests">
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <button className="font-bold text-[var(--color-primary)]" onClick={() => navigate('/laboratory/requests')} type="button">{t('laboratory.detail.back')}</button>
      <header className="mt-4 rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l">
        <p className="font-bold text-[var(--color-primary)]">{t('laboratory.detail.eyebrow')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">{t('laboratory.detail.title')}</h1><LaboratoryStatusBadge status={order.status} /></div>
      </header>
      {message && <p className="mt-4 font-semibold text-[var(--color-primary)]">{message}</p>}
      <dl className="mt-6 grid gap-4 rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:grid-cols-2">
        <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.detail.reference')}</dt><dd className="mt-1 font-extrabold">{order.reference}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.detail.date')}</dt><dd className="mt-1 font-semibold">{new Date(order.requested_at).toLocaleString(arabic ? 'ar-SD' : 'en')}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.detail.patient')}</dt><dd className="mt-1 font-semibold">{order.patient?.name}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.detail.phone')}</dt><dd className="direction-ltr mt-1 text-start font-semibold">{order.patient?.phone}</dd></div>
      </dl>
      <section className="mt-4 rounded-3xl border border-[var(--color-border)] bg-white p-6">
        <h2 className="font-extrabold">{t('laboratory.detail.tests')}</h2>
        <ul className="mt-3 space-y-2">{(order.items ?? []).map((item) => <li className="flex justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3" key={item.id}><span><p className="font-bold">{arabic ? item.name_ar : item.name_en}</p><p className="text-sm text-[var(--color-text-secondary)]">{t('laboratory.catalog.hours', { count: item.estimated_turnaround_hours })}</p></span><span className="font-semibold">{item.price} {item.currency}</span></li>)}</ul>
        {order.total && <p className="mt-4 text-end font-extrabold">{t('laboratory.detail.total')}: {order.total} {order.currency}</p>}
      </section>
      {order.events && order.events.length > 0 && <section className="mt-4 rounded-3xl border border-[var(--color-border)] bg-white p-6"><h2 className="font-extrabold">{t('laboratory.detail.history')}</h2><ul className="mt-3 space-y-2 text-sm">{order.events.map((event) => <li key={event.id}>{event.from_status ? `${t(`laboratory.statuses.${event.from_status}`)} → ` : ''}{t(`laboratory.statuses.${event.to_status}`)}</li>)}</ul></section>}
      <div className="mt-6 flex flex-wrap gap-3">
        {order.status === 'requested' && <button className="rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={() => move('sample_collected')} type="button">{t('laboratory.detail.markCollected')}</button>}
        {order.status === 'sample_collected' && <button className="rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={() => move('in_progress')} type="button">{t('laboratory.detail.markProgress')}</button>}
        {(order.status === 'in_progress' || order.status === 'result_ready') && <label className="rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white">{t(busy === 'upload' ? 'laboratory.detail.uploading' : 'laboratory.detail.upload')}<input accept=".pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file) }} type="file" /></label>}
        {order.result && <>
          <button className="rounded-full border border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)]" onClick={() => openLaboratoryResult(`/api/v1/laboratory/orders/${order.id}/result`)} type="button">{t('laboratory.detail.view')}</button>
          <button className="rounded-full border border-[var(--color-border)] px-5 py-3 font-bold" onClick={() => downloadLaboratoryResult(`/api/v1/laboratory/orders/${order.id}/result`)} type="button">{t('laboratory.detail.download')}</button>
        </>}
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{t('laboratory.detail.fileHelp')}</p>
    </div>
  </LaboratoryLayout>
}
