import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryStatusBadge } from '../../components/laboratory/LaboratoryStatusBadge'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { createPatientLaboratoryOrder, downloadLaboratoryResult, getPatientLaboratoryOfferings, getPatientLaboratoryOrders, openLaboratoryResult, type LaboratoryOrder } from '../../services/laboratoryService'

export function PatientLaboratoryPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<LaboratoryOrder[]>([])
  const [query, setQuery] = useState('')
  const [offerings, setOfferings] = useState<Awaited<ReturnType<typeof getPatientLaboratoryOfferings>>['offerings']>([])
  const [selectedLab, setSelectedLab] = useState<number | null>(null)
  const [selectedTests, setSelectedTests] = useState<number[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const arabic = i18n.language.startsWith('ar')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getPatientLaboratoryOrders(controller.signal), getPatientLaboratoryOfferings(query, controller.signal)])
      .then(([patientOrders, discovery]) => { setOrders(patientOrders); setOfferings(discovery.offerings); setState('success') })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
        else setState('error')
      })
    return () => controller.abort()
  }, [navigate, query])

  const labs = useMemo(() => {
    const map = new Map<number, { id: number; name: string; address: string; location: string; tests: typeof offerings }>()
    offerings.forEach((offering) => {
      const current = map.get(offering.laboratory_profile_id) ?? { id: offering.laboratory_profile_id, name: offering.laboratory_name, address: offering.address, location: arabic ? offering.location?.name_ar ?? '' : offering.location?.name_en ?? '', tests: [] }
      current.tests = [...current.tests, offering]
      map.set(offering.laboratory_profile_id, current)
    })
    return [...map.values()]
  }, [arabic, offerings])

  async function submit() {
    if (!selectedLab || selectedTests.length === 0) return
    setBusy(true)
    try {
      const created = await createPatientLaboratoryOrder(selectedLab, selectedTests)
      setOrders((current) => [created, ...current])
      setSelectedTests([])
      setMessage(t('patient.laboratory.submitted'))
    } catch { setMessage(t('patient.laboratory.submitError')) }
    finally { setBusy(false) }
  }

  return <PatientLayout activeSection="laboratory">
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-[var(--color-primary)]">{t('patient.laboratory.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('patient.laboratory.title')}</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('patient.laboratory.description')}</p>
      </header>
      {message && <p className="mt-4 font-semibold text-[var(--color-primary)]">{message}</p>}
      {state === 'loading' ? <LoadingState contained message={t('patient.laboratory.loading')} /> : state === 'error' ? <ErrorState contained message={t('patient.laboratory.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : <>
        <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold">{t('patient.laboratory.results')}</h2>
          {orders.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.emptyResults')}</p> : <ul className="mt-4 grid gap-3">{orders.map((order) => <li className="rounded-2xl border border-[var(--color-border)] p-4" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div>{(order.items ?? []).map((item) => <p className="font-extrabold" key={item.id}>{arabic ? item.name_ar : item.name_en}</p>)}<p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.laboratory')}: {order.laboratory_name}</p><p className="text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.date')}: {new Date(order.requested_at).toLocaleDateString(arabic ? 'ar-SD' : 'en')}</p></div><LaboratoryStatusBadge status={order.status} /></div>
            {order.status === 'result_ready' && order.result && <div className="mt-3 flex flex-wrap gap-3"><button className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => openLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.view')}</button><button className="rounded-full border border-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary)]" onClick={() => downloadLaboratoryResult(`/api/v1/patient/laboratory-orders/${order.id}/result`)} type="button">{t('patient.laboratory.download')}</button></div>}
          </li>)}</ul>}
        </section>
        <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold">{t('patient.laboratory.request')}</h2>
          <input className="mt-4 min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 font-semibold" onChange={(event) => { setQuery(event.target.value); setState('loading') }} placeholder={t('patient.laboratory.search')} value={query} />
          {labs.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.emptyLabs')}</p> : <ul className="mt-4 grid gap-3">{labs.map((lab) => <li className={`rounded-2xl border p-4 ${selectedLab === lab.id ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`} key={lab.id}>
            <button className="w-full text-start" onClick={() => { setSelectedLab(lab.id); setSelectedTests([]) }} type="button"><p className="font-extrabold">{lab.name}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{lab.location} · {lab.address}</p></button>
            {selectedLab === lab.id && <div className="mt-3 space-y-2"><p className="text-sm font-bold">{t('patient.laboratory.selectTests')}</p>{lab.tests.map((test) => <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3" key={test.id}><input checked={selectedTests.includes(test.lab_test_id)} onChange={(event) => setSelectedTests((current) => event.target.checked ? [...current, test.lab_test_id] : current.filter((value) => value !== test.lab_test_id))} type="checkbox" /><span><span className="block font-bold">{arabic ? test.name_ar : test.name_en}</span><span className="block text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.price')}: {test.price} {test.currency} · {t('patient.laboratory.turnaround')}: {t('patient.laboratory.hours', { count: test.estimated_turnaround_hours })}</span></span></label>)}<button className="mt-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-bold text-white disabled:opacity-50" disabled={busy || selectedTests.length === 0} onClick={submit} type="button">{t(busy ? 'patient.laboratory.submitting' : 'patient.laboratory.submit')}</button></div>}
          </li>)}</ul>}
        </section>
      </>}
    </div>
  </PatientLayout>
}
