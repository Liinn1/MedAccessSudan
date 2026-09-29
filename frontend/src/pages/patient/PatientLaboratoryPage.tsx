import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookingHero } from '../../components/booking/BookingHero'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { BookingPaymentSummary } from '../../components/booking/BookingPaymentSummary'
import { BookingProgress } from '../../components/booking/BookingProgress'
import { BookingReviewList } from '../../components/booking/BookingReviewList'
import { PaymentMethodSelector } from '../../components/booking/PaymentMethodSelector'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, type AuthenticatedUser } from '../../services/authService'
import { useBookingPayment } from '../../hooks/useBookingPayment'
import type { ServicePayment } from '../../services/paymentTypes'
import {
  createPatientLaboratoryOrder,
  formatLaboratoryPrice,
  getPatientLaboratoryDiscovery,
  type LaboratoryMatch,
  type PatientLaboratoryDiscovery,
} from '../../services/laboratoryService'

type Step = 'tests' | 'laboratory' | 'review' | 'success'

export function PatientLaboratoryPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const arabic = i18n.language.startsWith('ar')
  const locale = arabic ? 'ar-SD' : 'en'
  const [step, setStep] = useState<Step>('tests')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [chosenLab, setChosenLab] = useState<LaboratoryMatch | null>(null)
  const [showPartial, setShowPartial] = useState(false)
  const [discovery, setDiscovery] = useState<PatientLaboratoryDiscovery | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdPayment, setCreatedPayment] = useState<ServicePayment | null>(null)
  const payment = useBookingPayment()

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    getPatientLaboratoryDiscovery({
      query: debouncedQuery,
      categoryId: categoryId ?? undefined,
      locationId: locationId ?? undefined,
      labTestIds: selectedIds,
    }, controller.signal).then((catalog) => {
      setDiscovery(catalog)
      setState('success')
    }).catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) navigate('/login', { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [categoryId, debouncedQuery, locationId, navigate, selectedIds.join(',')])

  useEffect(() => {
    const controller = new AbortController()
    getCurrentUser(controller.signal).then(setUser).catch(() => undefined)
    return () => controller.abort()
  }, [])

  const complete = discovery?.matches.complete ?? []
  const partial = discovery?.matches.partial ?? []
  const labsToShow = complete.length > 0 || !showPartial ? complete : partial
  const progressSteps = ['tests', 'laboratory', 'review'] as const
  const currentIndex = step === 'success' ? 2 : progressSteps.indexOf(step)
  const selectedNames = (discovery?.tests ?? []).filter((test) => selectedIds.includes(test.id))

  function toggleTest(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
    setChosenLab(null)
    setShowPartial(false)
  }

  async function confirm() {
    if (!chosenLab?.offers_all || busy) return
    if (!payment.validate(t)) return
    setBusy(true)
    setError('')
    try {
      const order = await createPatientLaboratoryOrder(chosenLab.laboratory_profile_id, selectedIds, payment.payload().payment_method)
      setCreatedPayment(order.payment ?? null)
      setStep('success')
    } catch {
      setError(t('patient.laboratory.submitError'))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' && !discovery) return <PatientLayout activeSection="laboratory"><LoadingState contained message={t('patient.laboratory.loading')} /></PatientLayout>
  if (state === 'error' && !discovery) return <PatientLayout activeSection="laboratory"><ErrorState contained message={t('patient.laboratory.error')} onRetry={() => { setState('loading'); setSelectedIds((current) => [...current]) }} retryLabel={t('laboratory.dashboard.retry')} /></PatientLayout>

  return <PatientLayout activeSection="laboratory"><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
    <BookingHero description={t('patient.laboratory.description')} eyebrow={t('patient.laboratory.eyebrow')} title={t('patient.laboratory.title')} />
    <BookingProgress
      ariaLabel={t('patient.laboratory.progress')}
      currentIndex={currentIndex}
      steps={progressSteps.map((item, index) => ({
        id: item,
        label: t(`patient.laboratory.steps.${item}`),
        onSelect: step !== 'success' && index < currentIndex ? () => setStep(item) : undefined,
      }))}
    />

    {step === 'tests' && <BookingPanel>
      <input className="min-h-12 w-full rounded-xl border border-[var(--color-border)] px-4 font-semibold" onChange={(event) => setQuery(event.target.value)} placeholder={t('patient.laboratory.search')} value={query} />
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        <button className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${categoryId === null ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white'}`} onClick={() => setCategoryId(null)} type="button">{t('patient.laboratory.allCategories')}</button>
        {(discovery?.categories ?? []).map((category) => (
          <button className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${categoryId === category.id ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white'}`} key={category.id} onClick={() => setCategoryId(category.id ?? null)} type="button">{arabic ? category.name_ar : category.name_en}</button>
        ))}
      </div>
      {(discovery?.tests.length ?? 0) === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-secondary)]">{t('patient.laboratory.emptyTests')}</p> : <ul className="mt-5 grid gap-3">{(discovery?.tests ?? []).map((test) => {
        const selected = selectedIds.includes(test.id)
        return <li key={test.id}><label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)]' : 'border-[var(--color-border)] bg-white'}`}>
          <input checked={selected} className="mt-1 size-4 accent-[var(--color-primary)]" onChange={() => toggleTest(test.id)} type="checkbox" />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">{arabic ? test.name_ar : test.name_en}</span>
            {test.short_name && <span className="mt-0.5 block text-sm font-semibold text-[var(--color-primary)]">{test.short_name}</span>}
            <span className="mt-2 block text-sm text-[var(--color-text-secondary)]">{test.category ? (arabic ? test.category.name_ar : test.category.name_en) : ''}</span>
            <span className="block text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.availableAt', { count: test.laboratory_count })}</span>
            <span className="mt-1 block font-bold">{test.laboratory_count === 1 ? t('patient.laboratory.price') : t('patient.laboratory.fromPrice')}: {formatLaboratoryPrice(test.min_price, test.currency, locale)}</span>
          </span>
        </label></li>
      })}</ul>}
      {selectedIds.length > 0 && <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <p className="font-extrabold">{t('patient.laboratory.selectedCount', { count: selectedIds.length })}</p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{selectedNames.map((test) => test.short_name || (arabic ? test.name_ar : test.name_en)).join(' · ')}</p>
        <button className="mt-4 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white" onClick={() => { setShowPartial(false); setStep('laboratory') }} type="button">{t('patient.laboratory.findLaboratories')}</button>
      </div>}
    </BookingPanel>}

    {step === 'laboratory' && <BookingPanel>
      <button className="w-fit font-bold text-[var(--color-primary)]" onClick={() => setStep('tests')} type="button">← {t('patient.laboratory.backToTests')}</button>
      <h2 className="mt-4 text-xl font-extrabold">{t('patient.laboratory.labsTitle')}</h2>
      <label className="mt-4 block font-bold">{t('patient.laboratory.locationFilter')}
        <select className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4" onChange={(event) => setLocationId(event.target.value ? Number(event.target.value) : null)} value={locationId ?? ''}>
          <option value="">{t('patient.laboratory.allLocations')}</option>
          {(discovery?.locations ?? []).map((location) => <option key={location.id ?? location.code} value={location.id}>{arabic ? location.name_ar : location.name_en}</option>)}
        </select>
      </label>
      {complete.length === 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-bold">{t('patient.laboratory.noComplete')}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('patient.laboratory.noCompleteHelp')}</p>
        {!showPartial && partial.length > 0 && <button className="mt-3 font-bold text-[var(--color-primary)]" onClick={() => setShowPartial(true)} type="button">{t('patient.laboratory.viewPartial')}</button>}
      </div>}
      {labsToShow.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed p-8 text-center text-[var(--color-text-secondary)]">{t('patient.laboratory.emptyLabs')}</p> : <ul className="mt-4 grid gap-4">{labsToShow.map((lab) => (
        <li className="rounded-2xl border border-[var(--color-border)] p-4" key={lab.laboratory_profile_id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold">{lab.laboratory_name}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{[arabic ? lab.location?.name_ar : lab.location?.name_en, lab.address].filter(Boolean).join(' — ')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${lab.offers_all ? 'bg-[var(--color-success-surface)] text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{lab.offers_all ? t('patient.laboratory.offersAll') : t('patient.laboratory.offersSome', { count: lab.matched_count, total: lab.selected_count })}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm">{lab.items.map((item) => <li className="flex justify-between gap-3" key={item.lab_test_id}><span>{arabic ? item.name_ar : item.name_en}</span><span className="font-semibold">{formatLaboratoryPrice(item.price, item.currency, locale)}</span></li>)}</ul>
          <p className="mt-3 text-end font-extrabold">{t('patient.laboratory.total')}: {formatLaboratoryPrice(lab.total, lab.currency, locale)}</p>
          {lab.offers_all && <button className="mt-3 min-h-11 w-full rounded-full bg-[var(--color-primary)] px-4 font-bold text-white" onClick={() => { setChosenLab(lab); setStep('review') }} type="button">{t('patient.laboratory.selectLaboratory')}</button>}
        </li>
      ))}</ul>}
    </BookingPanel>}

    {step === 'review' && chosenLab && <BookingPanel>
      <button className="font-bold text-[var(--color-primary)]" onClick={() => setStep('laboratory')} type="button">← {t('patient.laboratory.backToLabs')}</button>
      <h2 className="mt-4 text-2xl font-extrabold">{t('patient.laboratory.confirmTitle')}</h2>
      <BookingReviewList rows={[
        { label: t('patient.laboratory.laboratory'), value: chosenLab.laboratory_name },
        { label: t('patient.laboratory.location'), value: [arabic ? chosenLab.location?.name_ar : chosenLab.location?.name_en, chosenLab.address].filter(Boolean).join(' — ') },
        ...(user ? [{ label: t('patient.laboratory.patient'), value: user.name }] : []),
      ]} />
      <ul className="mt-2 space-y-2">{chosenLab.items.map((item) => <li className="flex justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3" key={item.lab_test_id}><span className="font-bold">{arabic ? item.name_ar : item.name_en}</span><span className="font-semibold">{formatLaboratoryPrice(item.price, item.currency, locale)}</span></li>)}</ul>
      <p className="mt-4 text-end text-lg font-extrabold">{t('patient.laboratory.total')}: {formatLaboratoryPrice(chosenLab.total, chosenLab.currency, locale)}</p>
      <PaymentMethodSelector card={payment.card} errors={payment.errors} method={payment.method} onCardChange={payment.setCard} onMethodChange={payment.setMethod} />
      <button className="mt-6 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-60" disabled={busy} onClick={confirm} type="button">{t(busy ? 'patient.laboratory.submitting' : 'patient.laboratory.confirm')}</button>
    </BookingPanel>}

    {step === 'success' && <BookingPanel className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span>
      <h2 className="mt-4 text-3xl font-extrabold">{t('patient.laboratory.successTitle')}</h2>
      <p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.laboratory.successDescription')}</p>
      <BookingPaymentSummary payment={createdPayment} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button className="rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate('/patient/appointments')} type="button">{t('patient.laboratory.viewAppointments')}</button>
        <button className="rounded-full border border-[var(--color-primary)] px-6 py-3 font-bold text-[var(--color-primary)]" onClick={() => navigate('/patient/home')} type="button">{t('patient.laboratory.backDashboard')}</button>
      </div>
    </BookingPanel>}
    <p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-red-700">{error}</p>
  </div></PatientLayout>
}
