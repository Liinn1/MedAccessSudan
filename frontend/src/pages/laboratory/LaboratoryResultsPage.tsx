import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getLaboratoryOrders, type LaboratoryOrder } from '../../services/laboratoryService'

export function LaboratoryResultsPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<LaboratoryOrder[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const arabic = i18n.language.startsWith('ar')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLaboratoryOrders('in_progress', '', controller.signal), getLaboratoryOrders('result_ready', '', controller.signal)])
      .then(([progress, ready]) => { setOrders([...progress, ...ready]); setState('success') })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
        else setState('error')
      })
    return () => controller.abort()
  }, [navigate])

  return <LaboratoryLayout activeSection="results">
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-[var(--color-primary)]">{t('laboratory.results.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('laboratory.results.title')}</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('laboratory.results.description')}</p>
      </header>
      {state === 'loading' ? <LoadingState contained message={t('laboratory.results.loading')} /> : state === 'error' ? <ErrorState contained message={t('laboratory.results.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : orders.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-secondary)]">{t('laboratory.results.empty')}</p> : <ul className="mt-6 grid gap-3">{orders.map((order) => <li className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={order.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{order.patient?.name}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</p></div><LaboratoryStatusBadge status={order.status} /></div><button className="mt-4 font-bold text-[var(--color-primary)]" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">{t('laboratory.requests.open')}</button></li>)}</ul>}
    </div>
  </LaboratoryLayout>
}
