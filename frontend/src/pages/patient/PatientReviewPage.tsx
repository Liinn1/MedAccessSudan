import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getPatientLaboratoryOrder } from '../../services/laboratoryService'
import { getPatientAppointment } from '../../services/patientAppointmentService'
import { submitProviderReview, type ProviderReview, type RateableProvider } from '../../services/providerReviewService'
import { buildLoginPath } from '../../utils/navigation'

type ReviewTarget = { name: string; review: ProviderReview | null; eligible: boolean }

const copy = {
  doctor: { eyebrow: 'patient.review.eyebrow', ineligible: 'patient.review.ineligible', back: 'patient.review.back', backToList: 'patient.appointmentDetails.back' },
  laboratory: { eyebrow: 'patient.review.laboratoryEyebrow', ineligible: 'patient.review.laboratoryIneligible', back: 'patient.review.backToRequest', backToList: 'patient.appointmentDetails.back' },
} as const

async function loadTarget(provider: RateableProvider, id: number, signal: AbortSignal): Promise<ReviewTarget> {
  if (provider === 'doctor') {
    const appointment = await getPatientAppointment(id, signal)
    return { name: appointment.doctor.name, review: appointment.review, eligible: appointment.status === 'completed' }
  }
  const order = await getPatientLaboratoryOrder(id, signal)
  return { name: order.laboratory_name, review: order.review ?? null, eligible: Boolean(order.review || order.can_review) }
}

export function PatientReviewPage({ provider = 'doctor' }: { provider?: RateableProvider }) {
  const params = useParams()
  const id = Number(provider === 'doctor' ? params.appointmentId : params.orderId); const valid = Number.isInteger(id) && id > 0; const { t } = useTranslation(); const navigate = useNavigate()
  const servicePath = provider === 'doctor' ? `/patient/appointments/${id}` : `/patient/laboratory/orders/${id}`
  const text = copy[provider]
  const [target, setTarget] = useState<ReviewTarget | null>(null); const [state, setState] = useState<'loading' | 'eligible' | 'ineligible' | 'error'>(valid ? 'loading' : 'ineligible'); const [attempt, setAttempt] = useState(0); const [rating, setRating] = useState(0); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('')
  useEffect(() => { if (!valid) return; const controller = new AbortController(); loadTarget(provider, id, controller.signal).then((value) => { setTarget(value); setState(value.eligible ? 'eligible' : 'ineligible') }).catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return; if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath(`${servicePath}/review`), { replace: true }); else setState('error') }); return () => controller.abort() }, [attempt, id, navigate, provider, servicePath, valid])
  async function submit() { if (!target || rating < 1) return; setBusy(true); try { const review = await submitProviderReview(provider, id, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }); setTarget({ ...target, review }); setMessage(t('patient.review.submitted')) } catch { setMessage(t('patient.review.error')) } finally { setBusy(false) } }
  if (state === 'loading') return <PatientLayout activeSection="appointments"><LoadingState contained message={t('patient.review.loading')} /></PatientLayout>
  if (state === 'error') return <PatientLayout activeSection="appointments"><ErrorState contained message={t('patient.review.loadError')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PatientLayout>
  if (state === 'ineligible' || !target) return <PatientLayout activeSection="appointments"><div className="grid min-h-[55dvh] place-items-center px-5"><section className="page-enter max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm"><p className="text-[var(--color-text-secondary)]">{t(text.ineligible)}</p><button className="mt-5 min-h-11 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate('/patient/appointments')} type="button">{t(text.backToList)}</button></section></div></PatientLayout>
  return <PatientLayout activeSection="appointments"><div className="px-5 py-10 sm:px-8"><section className="mx-auto max-w-2xl rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-9"><p className="font-bold text-[var(--color-primary)]">{t(text.eyebrow)}</p><h1 className="mt-2 text-3xl font-extrabold">{target.name}</h1>{target.review ? <div className="mt-7 rounded-2xl bg-[var(--color-primary-surface)] p-6"><p className="text-2xl tracking-widest text-amber-500">{'★'.repeat(target.review.rating)}{'☆'.repeat(5 - target.review.rating)}</p>{target.review.comment && <p className="mt-3">{target.review.comment}</p>}<p className="mt-4 font-bold text-[var(--color-primary)]">{t('patient.review.alreadySubmitted')}</p></div> : <><fieldset className="mt-7"><legend className="font-bold">{t('patient.review.rating')}</legend><div className="mt-3 flex gap-2" dir="ltr">{[1, 2, 3, 4, 5].map((value) => <button aria-label={t('patient.review.starLabel', { value })} className={`text-4xl transition hover:scale-110 motion-reduce:transform-none ${value <= rating ? 'text-amber-500' : 'text-slate-300'}`} key={value} onClick={() => setRating(value)} type="button">★</button>)}</div></fieldset><label className="mt-6 block font-bold">{t('patient.review.comment')}<textarea className="mt-2 block min-h-32 w-full rounded-2xl border border-[var(--color-border)] p-4" maxLength={2000} onChange={(event) => setComment(event.target.value)} value={comment} /></label><button className="mt-6 w-full rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={rating < 1 || busy} onClick={submit} type="button">{t(busy ? 'patient.review.submitting' : 'patient.review.submit')}</button></>}<p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-[var(--color-primary)]">{message}</p><button className="mt-3 w-full rounded-full border border-[var(--color-border)] px-6 py-3 font-bold" onClick={() => navigate(servicePath)} type="button">{t(text.back)}</button></section></div></PatientLayout>
}
