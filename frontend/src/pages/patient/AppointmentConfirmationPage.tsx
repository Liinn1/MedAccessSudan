import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { BookingReviewList } from '../../components/booking/BookingReviewList'
import { ClinicVisitFrame } from '../../components/booking/ClinicVisitFrame'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorProfile, type DoctorAvailabilitySlot, type DoctorProfile } from '../../services/doctorService'
import { bookPatientAppointment, type PatientAppointment } from '../../services/patientAppointmentService'
import { clearAppointmentDraft, loadAppointmentDraft } from '../../utils/appointmentDraft'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { buildLoginPath } from '../../utils/navigation'

type PageState = 'loading' | 'ready' | 'error' | 'unavailable' | 'success'

export function AppointmentConfirmationPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [draft] = useState(loadAppointmentDraft)
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [slot, setSlot] = useState<DoctorAvailabilitySlot | null>(null)
  const [appointment, setAppointment] = useState<PatientAppointment | null>(null)
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<PageState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!draft) return
    const controller = new AbortController()
    getDoctorProfile(draft.doctorId, controller.signal, 'clinic').then((profile) => {
      const selected = profile.availability.find((candidate) => candidate.id === draft.availabilityId || candidate.starts_at === draft.availabilityId)
      setDoctor(profile)
      setSlot(selected ?? null)
      setState(selected ? 'ready' : 'unavailable')
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate(buildLoginPath('/patient/appointments/confirm'), { replace: true })
      else setState('error')
    })
    return () => controller.abort()
  }, [attempt, draft, navigate])

  async function confirm() {
    if (!draft || !slot || submitting) return
    setSubmitting(true)
    setMessage('')
    try {
      const created = await bookPatientAppointment({ doctor_profile_id: draft.doctorId, starts_at: slot.starts_at, service_type: 'clinic', ...(notes.trim() ? { notes: notes.trim() } : {}) })
      clearAppointmentDraft()
      setAppointment(created)
      setState('success')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setState('unavailable')
        setMessage(t('patient.appointmentConfirmation.slotUnavailable'))
      } else {
        setMessage(t('patient.appointmentConfirmation.bookingError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!draft) {
    return <PatientLayout activeSection="book"><ErrorState contained message={t('patient.appointmentConfirmation.missing')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.appointmentConfirmation.findDoctor')} /></PatientLayout>
  }

  const arabic = i18n.resolvedLanguage === 'ar'
  const locale = arabic ? 'ar-SD' : 'en'

  return (
    <PatientLayout activeSection="book">
      <ClinicVisitFrame step="review">
        {state === 'loading' ? <LoadingState contained message={t('patient.appointmentConfirmation.loading')} /> : state === 'error' ? <ErrorState contained message={t('patient.appointmentConfirmation.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /> : state === 'unavailable' || !doctor || !slot ? <ErrorState contained message={message || t('patient.appointmentConfirmation.slotUnavailable')} onRetry={() => navigate(`/patient/doctors/${draft.doctorId}`)} retryLabel={t('patient.appointmentConfirmation.chooseAgain')} /> : state === 'success' && appointment ? (
          <BookingPanel className="text-center">
            <div aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--color-success-surface)] text-2xl font-black text-emerald-700">✓</div>
            <h2 className="mt-4 text-3xl font-extrabold">{t('patient.appointmentConfirmation.successTitle')}</h2>
            <p className="mt-2 text-[var(--color-text-secondary)]">{t('patient.appointmentConfirmation.successDescription')}</p>
            <button className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white" onClick={() => navigate(`/patient/appointments/${appointment.id}`)} type="button">{t('patient.appointmentConfirmation.viewAppointment')}</button>
          </BookingPanel>
        ) : (
          <ClinicReview doctor={doctor} locale={locale} notes={notes} onConfirm={confirm} onNotes={setNotes} slot={slot} submitting={submitting} message={message} />
        )}
      </ClinicVisitFrame>
    </PatientLayout>
  )
}

function ClinicReview({ doctor, locale, notes, onConfirm, onNotes, slot, submitting, message }: {
  doctor: DoctorProfile
  locale: string
  notes: string
  onConfirm: () => void
  onNotes: (value: string) => void
  slot: DoctorAvailabilitySlot
  submitting: boolean
  message: string
}) {
  const { t, i18n } = useTranslation()
  const arabic = i18n.resolvedLanguage === 'ar'
  const start = new Date(slot.starts_at)
  const end = new Date(slot.ends_at)
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: SUDAN_TIME_ZONE }).format(start)
  const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: SUDAN_TIME_ZONE })
  const specialty = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = doctor.location ? (arabic ? doctor.location.name_ar : doctor.location.name_en) : ''
  const time = `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`

  return (
    <BookingPanel>
      <h2 className="text-2xl font-extrabold">{t('patient.appointmentConfirmation.title')}</h2>
      <BookingReviewList rows={[
        { label: t('patient.appointmentConfirmation.doctor'), value: doctor.name },
        { label: t('patient.appointmentConfirmation.specialty'), value: specialty },
        { label: t('patient.appointmentConfirmation.serviceType'), value: t('patient.appointmentConfirmation.clinicVisit') },
        ...(doctor.clinic_name ? [{ label: t('patient.appointmentConfirmation.clinic'), value: doctor.clinic_name }] : []),
        ...(location ? [{ label: t('patient.appointmentConfirmation.location'), value: location }] : []),
        { label: t('patient.appointmentConfirmation.date'), value: date },
        { label: t('patient.appointmentConfirmation.time'), value: time, ltr: true },
      ]} />
      <label className="mt-4 block font-semibold">{t('patient.appointmentConfirmation.notes')}
        <textarea className="mt-2 block min-h-24 w-full resize-y rounded-2xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={2000} onChange={(event) => onNotes(event.target.value)} placeholder={t('patient.appointmentConfirmation.notesPlaceholder')} value={notes} />
      </label>
      <button className="mt-5 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting} onClick={onConfirm} type="button">{t(submitting ? 'patient.appointmentConfirmation.confirming' : 'patient.appointmentConfirmation.confirm')}</button>
      <p aria-live="polite" className="mt-3 min-h-6 text-center text-sm font-semibold text-red-700" role={message ? 'alert' : undefined}>{message}</p>
    </BookingPanel>
  )
}
