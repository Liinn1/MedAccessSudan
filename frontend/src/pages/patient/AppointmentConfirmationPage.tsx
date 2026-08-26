import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, ChevronIcon, LocationIcon, StethoscopeIcon } from '../../components/icons/PatientHomeIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorProfile, type DoctorAvailabilitySlot, type DoctorProfile } from '../../services/doctorService'
import { bookPatientAppointment, type PatientAppointment } from '../../services/patientAppointmentService'
import { clearAppointmentDraft, loadAppointmentDraft } from '../../utils/appointmentDraft'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildDoctorBookingPath, buildLoginPath } from '../../utils/navigation'

type PageState = 'loading' | 'ready' | 'error' | 'unavailable' | 'success'

export function AppointmentConfirmationPage() {
  const { i18n, t } = useTranslation(); const navigate = useNavigate(); const [draft] = useState(loadAppointmentDraft)
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null); const [slot, setSlot] = useState<DoctorAvailabilitySlot | null>(null); const [appointment, setAppointment] = useState<PatientAppointment | null>(null)
  const [notes, setNotes] = useState(''); const [state, setState] = useState<PageState>('loading'); const [attempt, setAttempt] = useState(0); const [submitting, setSubmitting] = useState(false); const [message, setMessage] = useState('')

  useEffect(() => {
    if (!draft) return
    const controller = new AbortController()
    getDoctorProfile(draft.doctorId, controller.signal).then((profile) => {
      const selected = profile.availability.find((candidate) => candidate.id === draft.availabilityId || candidate.starts_at === draft.availabilityId)
      setDoctor(profile); setSlot(selected ?? null); setState(selected ? 'ready' : 'unavailable')
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath('/patient/appointments/confirm'), { replace: true }); else setState('error')
    })
    return () => controller.abort()
  }, [attempt, draft, navigate])

  async function confirm() {
    if (!draft || !slot || submitting) return
    setSubmitting(true); setMessage('')
    try {
      const created = await bookPatientAppointment({ doctor_profile_id: draft.doctorId, starts_at: slot.starts_at, ...(notes.trim() ? { notes: notes.trim() } : {}) })
      clearAppointmentDraft(); setAppointment(created); setState('success')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) { setState('unavailable'); setMessage(t('patient.appointmentConfirmation.slotUnavailable')) } else setMessage(t('patient.appointmentConfirmation.bookingError'))
    } finally { setSubmitting(false) }
  }

  if (!draft) return <PublicLayout><ErrorState contained message={t('patient.appointmentConfirmation.missing')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.appointmentConfirmation.findDoctor')} /></PublicLayout>
  if (state === 'loading') return <PublicLayout><LoadingState contained message={t('patient.appointmentConfirmation.loading')} /></PublicLayout>
  if (state === 'error') return <PublicLayout><ErrorState contained message={t('patient.appointmentConfirmation.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PublicLayout>
  if (state === 'unavailable' || !doctor || !slot) return <PublicLayout><ErrorState contained message={message || t('patient.appointmentConfirmation.slotUnavailable')} onRetry={() => navigate(buildDoctorBookingPath(draft.doctorId))} retryLabel={t('patient.appointmentConfirmation.chooseAgain')} /></PublicLayout>

  const arabic = i18n.resolvedLanguage === 'ar'; const locale = arabic ? 'ar-SD' : 'en'; const start = new Date(slot.starts_at); const end = new Date(slot.ends_at)
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: SUDAN_TIME_ZONE }).format(start); const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE })
  const specialty = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en; const location = arabic ? doctor.location.name_ar : doctor.location.name_en; const time = `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`

  if (state === 'success' && appointment) return <PublicLayout><div className="bg-[var(--color-background)] px-5 py-10 sm:px-8"><section className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm sm:p-9"><div aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--color-success-surface)] text-2xl font-black text-emerald-700">✓</div><h1 className="mt-4 text-3xl font-extrabold">{t('patient.appointmentConfirmation.successTitle')}</h1><p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.appointmentConfirmation.successDescription')}</p><div className="mt-5 rounded-2xl bg-[var(--color-background)] p-4 text-start"><p className="font-extrabold">{doctor.name}</p><p className="mt-1 text-sm">{date}</p><p className="direction-ltr mt-1 text-start text-sm">{time}</p></div><div className="mt-6 flex flex-wrap justify-center gap-3"><button className="rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate(`/patient/appointments/${appointment.id}`)} type="button">{t('patient.appointmentConfirmation.viewAppointment')}</button><button className="rounded-full border border-[var(--color-border)] px-6 py-3 font-bold" onClick={() => navigate('/patient/home')} type="button">{t('patient.appointmentConfirmation.home')}</button></div></section></div></PublicLayout>

  const rows = [
    { label: t('patient.appointmentConfirmation.doctor'), value: doctor.name, icon: <StethoscopeIcon className="size-5" /> },
    { label: t('patient.appointmentConfirmation.specialty'), value: specialty },
    { label: t('patient.appointmentConfirmation.date'), value: date, icon: <CalendarIcon className="size-5" /> },
    { label: t('patient.appointmentConfirmation.time'), value: time, ltr: true },
    { label: t('patient.appointmentConfirmation.location'), value: doctor.clinic_name || location, icon: <LocationIcon className="size-5" /> },
    { label: t('patient.appointmentConfirmation.serviceType'), value: t('patient.appointmentConfirmation.clinicVisit') },
  ]

  return <PublicLayout><div className="bg-[var(--color-background)] px-5 py-7 sm:px-8 sm:py-10"><div className="mx-auto max-w-3xl"><button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate(buildDoctorBookingPath(draft.doctorId))} type="button"><ChevronIcon className="size-5 rtl:rotate-180" />{t('patient.appointmentConfirmation.back')}</button><header className="mt-4 text-center"><p className="font-bold text-[var(--color-primary)]">{t('patient.appointmentConfirmation.eyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('patient.appointmentConfirmation.title')}</h1><p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)] sm:text-base">{t('patient.appointmentConfirmation.description')}</p></header>
    <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="booking-summary-title"><h2 className="text-xl font-extrabold" id="booking-summary-title">{t('patient.appointmentConfirmation.summary')}</h2><dl className="mt-4 divide-y divide-[var(--color-border)]">{rows.map((row) => <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:items-center" key={row.label}><dt className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">{row.icon && <span className="text-[var(--color-primary)]">{row.icon}</span>}{row.label}</dt><dd className={`font-semibold ${row.ltr ? 'direction-ltr text-start' : ''}`}>{row.value}</dd></div>)}</dl>
      <label className="mt-4 block font-semibold">{t('patient.appointmentConfirmation.notes')}<textarea className="mt-2 block min-h-24 w-full resize-y rounded-2xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder={t('patient.appointmentConfirmation.notesPlaceholder')} value={notes} /></label>
      <button className="mt-5 min-h-14 w-full rounded-full bg-[var(--color-primary)] px-6 text-lg font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting} onClick={confirm} type="button">{t(submitting ? 'patient.appointmentConfirmation.confirming' : 'patient.appointmentConfirmation.confirm')}</button><p aria-live="polite" className="mt-3 min-h-6 text-center text-sm font-semibold text-red-700" role={message ? 'alert' : undefined}>{message}</p>
    </section></div></div></PublicLayout>
}
