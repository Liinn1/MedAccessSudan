import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getLaboratoryOrders, type LaboratoryOrder, type LaboratoryOrderStatus } from '../../services/laboratoryService'

const filters: Array<'all' | LaboratoryOrderStatus> = ['all', 'requested', 'sample_collected', 'in_progress', 'result_ready']

export function LaboratoryRequestsPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<LaboratoryOrder[]>([])
  const [status, setStatus] = useState<'all' | LaboratoryOrderStatus>('all')
  const [query, setQuery] = useState('')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const arabic = i18n.language.startsWith('ar')

  useEffect(() => {
    const controller = new AbortController()
    getLaboratoryOrders(status, query, controller.signal).then((data) => { setOrders(data); setState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [navigate, query, status])

  return <LaboratoryLayout activeSection="requests">
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-[var(--color-primary)]">{t('laboratory.requests.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('laboratory.requests.title')}</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('laboratory.requests.description')}</p>
      </header>
      <div className="mt-6 flex flex-wrap gap-2">{filters.map((filter) => <button className={`rounded-full px-4 py-2 text-sm font-bold ${status === filter ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white'}`} key={filter} onClick={() => { setStatus(filter); setState('loading') }} type="button">{t(`laboratory.filters.${filter}`)}</button>)}</div>
      <input className="mt-4 min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 font-semibold" onChange={(event) => { setQuery(event.target.value); setState('loading') }} placeholder={t('laboratory.requests.search')} value={query} />
      {state === 'loading' ? <LoadingState contained message={t('laboratory.requests.loading')} /> : state === 'error' ? <ErrorState contained message={t('laboratory.requests.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : orders.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-secondary)]">{t('laboratory.requests.empty')}</p> : <>
        <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-[var(--color-border)] bg-white md:block">
          <table className="min-w-full text-start text-sm"><thead className="bg-[var(--color-primary-surface)] text-xs font-bold uppercase tracking-wide"><tr><th className="px-4 py-3">{t('laboratory.requests.patient')}</th><th className="px-4 py-3">{t('laboratory.requests.tests')}</th><th className="px-4 py-3">{t('laboratory.requests.date')}</th><th className="px-4 py-3">{t('laboratory.requests.status')}</th><th className="px-4 py-3">{t('laboratory.requests.action')}</th></tr></thead>
            <tbody>{orders.map((order) => <tr className="border-t border-[var(--color-border)]" key={order.id}><td className="px-4 py-3 font-bold">{order.patient?.name}</td><td className="px-4 py-3">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</td><td className="px-4 py-3">{new Date(order.requested_at).toLocaleDateString(arabic ? 'ar-SD' : 'en')}</td><td className="px-4 py-3"><LaboratoryStatusBadge status={order.status} /></td><td className="px-4 py-3"><button className="font-bold text-[var(--color-primary)]" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">{t('laboratory.requests.open')}</button></td></tr>)}</tbody></table>
        </div>
        <ul className="mt-4 grid gap-3 md:hidden">{orders.map((order) => <li className="rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm" key={order.id}><div className="flex items-start justify-between gap-3"><p className="font-extrabold">{order.patient?.name}</p><LaboratoryStatusBadge status={order.status} /></div><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{(order.items ?? []).map((item) => arabic ? item.name_ar : item.name_en).join(', ')}</p><button className="mt-3 font-bold text-[var(--color-primary)]" onClick={() => navigate(`/laboratory/requests/${order.id}`)} type="button">{t('laboratory.requests.open')}</button></li>)}</ul>
      </>}
    </div>
  </LaboratoryLayout>
}
