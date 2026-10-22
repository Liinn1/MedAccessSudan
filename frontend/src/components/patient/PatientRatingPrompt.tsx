import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPatientAppointments, type PatientAppointment } from '../../services/patientAppointmentService'
import { submitProviderReview } from '../../services/providerReviewService'

const dismissedThisSession = new Set<number>()

export function PatientRatingPrompt({ enabled }: { enabled: boolean }) {
  const { i18n, t } = useTranslation()
  const [appointment, setAppointment] = useState<PatientAppointment | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getPatientAppointments(controller.signal).then((items) => {
      const target = items.filter((item) => item.status === 'completed' && !item.review && !dismissedThisSession.has(item.id)).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
      if (target) setAppointment(target)
    }).catch(() => undefined)
    return () => controller.abort()
  }, [enabled])

  useEffect(() => { if (appointment) requestAnimationFrame(() => closeRef.current?.focus()) }, [appointment])
  useEffect(() => {
    if (!appointment) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) dismiss() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  })

  function dismiss() { if (appointment && !busy) { dismissedThisSession.add(appointment.id); setAppointment(null) } }
  async function submit() {
    if (!appointment || rating < 1 || busy) return
    setBusy(true); setError('')
    try { await submitProviderReview('doctor', appointment.id, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }); dismissedThisSession.add(appointment.id); setAppointment(null) }
    catch { setError(t('patient.review.error')) }
    finally { setBusy(false) }
  }

  if (!appointment) return null
  const date = new Intl.DateTimeFormat(i18n.language.startsWith('ar') ? 'ar-SD' : 'en', { dateStyle: 'medium' }).format(new Date(appointment.starts_at))
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4"><section aria-labelledby="rating-prompt-title" aria-modal="true" className="w-full max-w-lg rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-2xl sm:p-8" role="dialog"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-[var(--color-primary)]">{t('patient.review.promptEyebrow')}</p><h2 className="mt-1 text-2xl font-extrabold" id="rating-prompt-title">{t('patient.review.promptTitle')}</h2></div><button aria-label={t('patient.review.close')} className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-xl hover:bg-slate-50" disabled={busy} onClick={dismiss} ref={closeRef} type="button">×</button></div><p className="mt-4 text-[var(--color-text-secondary)]">{t('patient.review.promptDescription', { doctor: appointment.doctor.name, date })}</p><fieldset className="mt-6"><legend className="font-bold">{t('patient.review.rating')}</legend><div className="mt-2 flex gap-2" dir="ltr">{[1,2,3,4,5].map((value) => <button aria-label={t('patient.review.starLabel', { value })} className={`text-4xl ${value <= rating ? 'text-amber-500' : 'text-slate-300'}`} key={value} onClick={() => setRating(value)} type="button">★</button>)}</div></fieldset><label className="mt-5 block font-bold">{t('patient.review.comment')}<textarea className="mt-2 block min-h-24 w-full rounded-2xl border border-[var(--color-border)] p-4" maxLength={2000} onChange={(event) => setComment(event.target.value)} value={comment} /></label>{error && <p aria-live="polite" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}<button className="mt-5 w-full rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={rating < 1 || busy} onClick={submit} type="button">{t(busy ? 'patient.review.submitting' : 'patient.review.submit')}</button></section></div>
}
