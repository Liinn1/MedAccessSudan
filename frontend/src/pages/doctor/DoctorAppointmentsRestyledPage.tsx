import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookingHero } from '../../components/booking/BookingHero'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState'
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LocationIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { PatientAppointmentCard } from '../../components/patient/PatientAppointmentCard'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { completeDoctorAppointment, getDoctorAppointments, startDoctorAppointment, type DoctorAppointment } from '../../services/doctorAppointmentService'
import { sudanDateKey, SUDAN_TIME_ZONE } from '../../utils/dateTime'

type AppointmentFilter = 'all' | 'today' | 'upcoming' | 'previous' | 'completed'
const filters: AppointmentFilter[] = ['all', 'today', 'upcoming', 'previous', 'completed']
const initialNow = Date.now()

function groupFor(appointment: DoctorAppointment, today: string): Exclude<AppointmentFilter, 'all'> {
  if (appointment.status === 'completed') return 'completed'
  const day = sudanDateKey(new Date(appointment.starts_at))
  return day === today ? 'today' : day > today ? 'upcoming' : 'previous'
}

function statusClasses(status: DoctorAppointment['status']) {
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600'
  if (status === 'in_progress') return 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]'
  return 'bg-[var(--color-success-surface)] text-emerald-800'
}

function AppointmentCard({ appointment, now, busy, onComplete, onStart }: { appointment: DoctorAppointment; now: number; busy: boolean; onComplete: (appointment: DoctorAppointment) => void; onStart: (appointment: DoctorAppointment) => void }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language.startsWith('ar') ? 'ar-SD' : 'en'
  const startsAt = new Date(appointment.starts_at)
  const Icon = appointment.service_type === 'home_visit' ? VisitIcon : StethoscopeIcon
  const location = appointment.home_visit ? [appointment.home_visit.area, appointment.home_visit.address_details].filter(Boolean).join(' — ') : t('doctor.appointments.services.clinic')
  const details = (appointment.notes || appointment.home_visit?.additional_directions || (appointment.home_visit?.latitude && appointment.home_visit.longitude)) ? <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
    {appointment.notes && <div><p className="font-bold text-[var(--color-text-secondary)]">{t('doctor.appointments.notes')}</p><p className="mt-1 whitespace-pre-wrap">{appointment.notes}</p></div>}
    {appointment.home_visit?.additional_directions && <div><p className="font-bold text-[var(--color-text-secondary)]">{t('doctor.appointments.homeVisitAddress')}</p><p className="mt-1 whitespace-pre-wrap">{appointment.home_visit.additional_directions}</p></div>}
    {appointment.home_visit?.latitude && appointment.home_visit.longitude && <a className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-primary)] bg-white px-4 font-bold text-[var(--color-primary)]" href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(appointment.home_visit.latitude)}&mlon=${encodeURIComponent(appointment.home_visit.longitude)}#map=17/${encodeURIComponent(appointment.home_visit.latitude)}/${encodeURIComponent(appointment.home_visit.longitude)}`} rel="noreferrer" target="_blank"><LocationIcon className="size-4" />{t('doctor.appointments.openLocation')}</a>}
  </div> : undefined
  const actions = <>
    {appointment.status === 'confirmed' && startsAt.getTime() <= now && <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white disabled:opacity-60" disabled={busy} onClick={() => onStart(appointment)} type="button">{t('doctor.appointments.start')}</button>}
    {appointment.status === 'confirmed' && startsAt.getTime() > now && <p className="rounded-2xl bg-[var(--color-primary-surface)] p-3 text-center text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.appointments.startAt', { time: new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(startsAt) })}</p>}
    {appointment.status === 'in_progress' && <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white" onClick={() => onComplete(appointment)} type="button">{t('doctor.appointments.end')}</button>}
  </>
  return <PatientAppointmentCard actions={actions} details={details} location={location} meta={[{ label: t('doctor.appointments.date'), value: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(startsAt) }, { label: t('doctor.appointments.time'), value: new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(startsAt), ltr: true }]} paymentLabel="" status={<span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(appointment.status)}`}>{t(`doctor.appointments.statuses.${appointment.status}`)}</span>} subtitle={t('doctor.appointments.patientLabel')} title={appointment.patient.name} typeBadge={<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-surface)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]"><Icon className="size-3.5" />{t(`doctor.appointments.services.${appointment.service_type}`)}</span>} />
}

export function DoctorAppointmentsRestyledPage() {
  const { t } = useTranslation(); const navigate = useNavigate()
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]); const [filter, setFilter] = useState<AppointmentFilter>('all'); const [state, setState] = useState<'loading' | 'success' | 'error'>('loading'); const [attempt, setAttempt] = useState(0); const [message, setMessage] = useState(''); const messageRef = useRef<HTMLParagraphElement>(null)
  const [appointmentToComplete, setAppointmentToComplete] = useState<DoctorAppointment | null>(null); const [completing, setCompleting] = useState(false); const [completionError, setCompletionError] = useState(''); const [startingId, setStartingId] = useState<number | null>(null); const [now, setNow] = useState(initialNow)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { const controller = new AbortController(); getDoctorAppointments(controller.signal).then((data) => { setAppointments(data); setState('success') }).catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return; if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true }); else setState('error') }); return () => controller.abort() }, [attempt, navigate])
  async function startAppointment(appointment: DoctorAppointment) { if (startingId !== null) return; setStartingId(appointment.id); setMessage(''); try { const updated = await startDoctorAppointment(appointment.id); setAppointments((items) => items.map((item) => item.id === updated.id ? updated : item)); setMessage(t('doctor.appointments.startedSuccess')) } catch { setMessage(t('doctor.appointments.startError')) } finally { setStartingId(null) } }
  function requestCompletion(appointment: DoctorAppointment) { setAppointmentToComplete(appointment); setCompletionError('') }
  function cancelCompletion() { if (!completing) { setAppointmentToComplete(null); setCompletionError('') } }
  async function confirmCompletion() { if (!appointmentToComplete || completing) return; setCompleting(true); setCompletionError(''); try { const updated = await completeDoctorAppointment(appointmentToComplete.id); setAppointments((items) => items.map((item) => item.id === updated.id ? updated : item)); setMessage(t('doctor.appointments.completedSuccess')); setAppointmentToComplete(null); requestAnimationFrame(() => messageRef.current?.focus()) } catch { setCompletionError(t('doctor.appointments.completeError')) } finally { setCompleting(false) } }
  const today = sudanDateKey(new Date())
  const filtered = useMemo(() => appointments.filter((appointment) => filter === 'all' || groupFor(appointment, today) === filter).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()), [appointments, filter, today])
  if (state === 'loading') return <DoctorLayout activeSection="appointments"><LoadingState contained message={t('doctor.appointments.loading')} /></DoctorLayout>
  if (state === 'error') return <DoctorLayout activeSection="appointments"><ErrorState contained message={t('doctor.appointments.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('doctor.dashboard.retry')} /></DoctorLayout>
  return <DoctorLayout activeSection="appointments"><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10"><BookingHero description={t('doctor.appointments.description')} eyebrow={t('doctor.appointments.eyebrow')} title={t('doctor.appointments.title')} /><p aria-live="polite" className="mt-4 min-h-6 text-center font-semibold text-[var(--color-primary)]" ref={messageRef} tabIndex={-1}>{message}</p><div className="mt-1 flex flex-wrap gap-2">{filters.map((item) => <button className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white'}`} key={item} onClick={() => setFilter(item)} type="button">{t(`doctor.appointments.filters.${item}`)}</button>)}</div>{filtered.length === 0 ? <BookingPanel><DashboardEmptyState description={t(`doctor.appointments.empty.${filter}`)} icon={CalendarIcon} title={t('doctor.appointments.emptyTitle')} /></BookingPanel> : <ul className="mt-6 grid gap-4 md:grid-cols-2">{filtered.map((appointment) => <li key={appointment.id}><AppointmentCard appointment={appointment} busy={startingId === appointment.id} now={now} onComplete={requestCompletion} onStart={startAppointment} /></li>)}</ul>}</div><ConfirmationDialog busy={completing} cancelLabel={t('doctor.appointments.completeCancel')} confirmLabel={t('doctor.appointments.end')} description={t('doctor.appointments.completeDescription')} error={completionError} loadingLabel={t('doctor.appointments.completing')} onCancel={cancelCompletion} onConfirm={confirmCompletion} open={appointmentToComplete !== null} title={t('doctor.appointments.endConfirm')} /></DoctorLayout>
}
