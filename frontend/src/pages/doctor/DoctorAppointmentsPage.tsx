import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LocationIcon } from '../../components/icons/PatientHomeIcons'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { completeDoctorAppointment, getDoctorAppointments, type DoctorAppointment } from '../../services/doctorAppointmentService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

function sudanDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: SUDAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function AppointmentCard({ appointment, onComplete }: { appointment: DoctorAppointment; onComplete: (appointment: DoctorAppointment) => void }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language.startsWith('ar') ? 'ar-SD' : 'en'
  const startsAt = new Date(appointment.starts_at)
  const endsAt = new Date(appointment.ends_at)
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: SUDAN_TIME_ZONE }).format(startsAt)
  const time = `${new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(startsAt)} – ${new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(endsAt)}`

  return <article className="service-card-enter rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md motion-reduce:transform-none sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-surface)] font-black text-[var(--color-primary)]">{appointment.patient.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h3 className="truncate text-lg font-extrabold">{appointment.patient.name}</h3><p className="mt-1 text-sm font-bold text-[var(--color-primary)]">{t(`doctor.appointments.services.${appointment.service_type}`)}</p></div></div><span className="rounded-full border border-emerald-200 bg-[var(--color-success-surface)] px-3 py-1 text-xs font-bold text-emerald-800">{t(`doctor.appointments.statuses.${appointment.status}`)}</span></div>
    <dl className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('doctor.appointments.date')}</dt><dd className="mt-1 font-semibold">{date}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('doctor.appointments.time')}</dt><dd className="direction-ltr mt-1 font-semibold">{time}</dd></div></dl>
    {appointment.home_visit && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="font-bold text-amber-900">{t('doctor.appointments.homeVisitAddress')}</p>{appointment.home_visit.city && <p className="mt-2 text-sm font-extrabold">{i18n.language.startsWith('ar') ? appointment.home_visit.city.name_ar : appointment.home_visit.city.name_en}</p>}<p className="mt-1 text-sm font-semibold">{appointment.home_visit.area}</p><p className="mt-1 whitespace-pre-wrap text-sm">{appointment.home_visit.address_details}</p><p className="direction-ltr mt-2 text-start text-sm font-semibold">{appointment.home_visit.contact_phone}</p>{appointment.home_visit.additional_directions && <p className="mt-2 whitespace-pre-wrap text-sm">{appointment.home_visit.additional_directions}</p>}{appointment.home_visit.latitude && appointment.home_visit.longitude && <a className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-primary)] bg-white px-4 py-2 font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" href={`https://www.google.com/maps?q=${encodeURIComponent(`${appointment.home_visit.latitude},${appointment.home_visit.longitude}`)}`} rel="noreferrer" target="_blank"><LocationIcon className="size-5" />{t('doctor.appointments.openLocation')}</a>}</div>}
    {appointment.notes && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('doctor.appointments.notes')}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{appointment.notes}</p></div>}
    {appointment.status === 'confirmed' && endsAt <= new Date() && <button className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-bold text-white" onClick={() => onComplete(appointment)} type="button">{t('doctor.appointments.complete')}</button>}
  </article>
}

export function DoctorAppointmentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [message, setMessage] = useState('')
  const messageRef = useRef<HTMLParagraphElement>(null)
  const [appointmentToComplete, setAppointmentToComplete] = useState<DoctorAppointment | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionError, setCompletionError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getDoctorAppointments(controller.signal).then((data) => { setAppointments(data); setState('success') }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true }); else setState('error')
    })
    return () => controller.abort()
  }, [attempt, navigate])

  function requestCompletion(appointment: DoctorAppointment) { setAppointmentToComplete(appointment); setCompletionError('') }
  function cancelCompletion() { if (completing) return; setAppointmentToComplete(null); setCompletionError('') }
  async function confirmCompletion() {
    if (!appointmentToComplete || completing) return
    setCompleting(true); setCompletionError('')
    try { const updated = await completeDoctorAppointment(appointmentToComplete.id); setAppointments((items) => items.map((item) => item.id === updated.id ? updated : item)); setMessage(t('doctor.appointments.completedSuccess')); setAppointmentToComplete(null); requestAnimationFrame(() => messageRef.current?.focus()) }
    catch { setCompletionError(t('doctor.appointments.completeError')) }
    finally { setCompleting(false) }
  }

  const today = sudanDateKey(new Date())
  const active = appointments.filter((item) => item.status !== 'completed')
  const todayAppointments = active.filter((item) => sudanDateKey(new Date(item.starts_at)) === today)
  const upcoming = active.filter((item) => sudanDateKey(new Date(item.starts_at)) > today)
  const previous = active.filter((item) => sudanDateKey(new Date(item.starts_at)) < today)
  const completed = appointments.filter((item) => item.status === 'completed')
  const section = (key: 'today' | 'upcoming' | 'previous' | 'completed', items: DoctorAppointment[]) => <section className="mt-7" aria-labelledby={`appointments-${key}`}><div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold" id={`appointments-${key}`}>{t(`doctor.appointments.sections.${key}`)}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t(`doctor.appointments.sectionDescriptions.${key}`)}</p></div><span className="rounded-full bg-[var(--color-primary-surface)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">{items.length}</span></div>{items.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{items.map((item, index) => <div key={item.id} style={{ animationDelay: `${index * 55}ms` }}><AppointmentCard appointment={item} onComplete={requestCompletion} /></div>)}</div> : <div className="mt-4 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-7 text-center text-[var(--color-text-secondary)]">{t(`doctor.appointments.empty.${key}`)}</div>}</section>

  return <DoctorLayout activeSection="appointments"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8"><p className="font-bold text-[var(--color-primary)]">{t('doctor.appointments.eyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('doctor.appointments.title')}</h1><p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('doctor.appointments.description')}</p></header><p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-[var(--color-primary)]" ref={messageRef} tabIndex={-1}>{message}</p>{state === 'loading' ? <LoadingState contained message={t('doctor.appointments.loading')} /> : state === 'error' ? <ErrorState contained message={t('doctor.appointments.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('doctor.dashboard.retry')} /> : appointments.length === 0 ? <div className="mt-7 rounded-3xl border border-[var(--color-border)] bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-extrabold">{t('doctor.appointments.emptyTitle')}</h2><p className="mt-2 text-[var(--color-text-secondary)]">{t('doctor.appointments.emptyDescription')}</p></div> : <>{section('today', todayAppointments)}{section('upcoming', upcoming)}{section('previous', previous)}{section('completed', completed)}</>}</div><ConfirmationDialog busy={completing} cancelLabel={t('doctor.appointments.completeCancel')} confirmLabel={t('doctor.appointments.complete')} description={t('doctor.appointments.completeDescription')} error={completionError} loadingLabel={t('doctor.appointments.completing')} onCancel={cancelCompletion} onConfirm={confirmCompletion} open={appointmentToComplete !== null} title={t('doctor.appointments.completeConfirm')} /></DoctorLayout>
}
