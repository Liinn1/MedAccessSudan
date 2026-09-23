import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ClinicVisitFrame } from '../../components/booking/ClinicVisitFrame'
import { BookingPanel } from '../../components/booking/BookingPanel'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, LocationIcon, StethoscopeIcon } from '../../components/icons/PatientHomeIcons'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorProfile, type DoctorProfile } from '../../services/doctorService'
import { saveAppointmentDraft } from '../../utils/appointmentDraft'
import { saveClinicDoctorId } from '../../utils/clinicVisitNav'
import { buildLoginPath } from '../../utils/navigation'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

type PageState = 'loading' | 'success' | 'error' | 'notFound'
const sudanDateKey = (value: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(value))

export function DoctorProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { doctorId } = useParams()
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [state, setState] = useState<PageState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const numericDoctorId = Number(doctorId)
  const hasValidDoctorId = Number.isInteger(numericDoctorId) && numericDoctorId > 0
  const arabic = i18n.resolvedLanguage === 'ar'

  useEffect(() => {
    if (!hasValidDoctorId) return
    saveClinicDoctorId(numericDoctorId)
    const controller = new AbortController()
    getDoctorProfile(numericDoctorId, controller.signal, 'clinic')
      .then((profile) => {
        setDoctor(profile)
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath(`/patient/doctors/${numericDoctorId}`), { replace: true })
        } else if (error instanceof ApiError && error.status === 404) {
          setState('notFound')
        } else {
          setState('error')
        }
      })
    return () => controller.abort()
  }, [attempt, hasValidDoctorId, i18n.resolvedLanguage, navigate, numericDoctorId])

  const formatSlot = (startsAt: string) => {
    const locale = arabic ? 'ar-SD' : 'en'
    const start = new Date(startsAt)
    const day = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric', timeZone: SUDAN_TIME_ZONE }).format(start)
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(start)
    return { day, time }
  }

  if (!hasValidDoctorId) {
    return <PatientLayout activeSection="book"><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PatientLayout>
  }

  return (
    <PatientLayout activeSection="book">
      <ClinicVisitFrame step="time">
        {state === 'loading' ? <LoadingState contained message={t('patient.doctorProfile.loading')} /> : state === 'error' ? <ErrorState contained message={t('patient.doctorProfile.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /> : state === 'notFound' || !doctor ? <ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /> : <DoctorClinicSlots arabic={arabic} doctor={doctor} formatSlot={formatSlot} onContinue={() => { if (!selectedSlotId) return; saveAppointmentDraft({ doctorId: numericDoctorId, availabilityId: selectedSlotId }); navigate('/patient/appointments/confirm') }} selectedSlotId={selectedSlotId} setSelectedSlotId={setSelectedSlotId} />}
      </ClinicVisitFrame>
    </PatientLayout>
  )
}

function DoctorClinicSlots({ arabic, doctor, formatSlot, onContinue, selectedSlotId, setSelectedSlotId }: {
  arabic: boolean
  doctor: DoctorProfile
  formatSlot: (startsAt: string) => { day: string; time: string }
  onContinue: () => void
  selectedSlotId: string | null
  setSelectedSlotId: (id: string) => void
}) {
  const { t } = useTranslation()
  const specialization = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = doctor.location ? (arabic ? doctor.location.name_ar : doctor.location.name_en) : ''
  const biography = doctor.biography || t('patient.doctorProfile.noBiography')
  const initials = doctor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const availabilityGroups = doctor.availability.reduce<Array<{ key: string; label: string; slots: typeof doctor.availability }>>((groups, slot) => {
    const key = sudanDateKey(slot.starts_at)
    const existing = groups.find((group) => group.key === key)
    if (existing) existing.slots.push(slot)
    else groups.push({ key, label: formatSlot(slot.starts_at).day, slots: [slot] })
    return groups
  }, [])

  return (
    <BookingPanel>
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-start">
        {doctor.profile_image_url ? <img alt={t('patient.doctorProfile.imageAlt', { name: doctor.name })} className="size-24 shrink-0 rounded-3xl object-cover shadow-md sm:size-28" src={doctor.profile_image_url} /> : <div aria-hidden="true" className="grid size-24 shrink-0 place-items-center rounded-3xl bg-[var(--color-primary)] text-3xl font-black text-white shadow-md sm:size-28">{initials}</div>}
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-[var(--color-success-surface)] px-3 py-1 text-sm font-bold text-emerald-700">{t('patient.doctorProfile.verified')}</span>
          <h2 className="mt-3 break-words text-2xl font-black sm:text-3xl">{doctor.name}</h2>
          <p className="mt-2 flex items-center justify-center gap-2 font-bold text-[var(--color-primary)] sm:justify-start"><StethoscopeIcon className="size-5 shrink-0" />{specialization}</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-[var(--color-text-secondary)] sm:justify-start"><LocationIcon className="size-5 shrink-0 text-[var(--color-primary)]" />{doctor.clinic_name || location}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <section>
          <h3 className="text-xl font-extrabold">{t('patient.doctorProfile.about')}</h3>
          <p className="mt-4 leading-relaxed text-[var(--color-text-secondary)]">{biography}</p>
          <dl className="mt-6 space-y-4 rounded-2xl bg-[var(--color-background)] p-5">
            <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.specialization')}</dt><dd className="mt-1 font-semibold">{specialization}</dd></div>
            {location && <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.location')}</dt><dd className="mt-1 font-semibold">{location}</dd></div>}
            {doctor.clinic_name && <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.clinic')}</dt><dd className="mt-1 font-semibold">{doctor.clinic_name}</dd></div>}
          </dl>
        </section>
        <section>
          <h3 className="flex items-center gap-2 text-xl font-extrabold"><CalendarIcon className="size-6 text-[var(--color-primary)]" />{t('patient.doctorProfile.availability')}</h3>
          {availabilityGroups.length ? <ol className="mt-4 space-y-3">{availabilityGroups.map((group, index) => <li className="service-card-enter rounded-xl border border-emerald-100 bg-[var(--color-success-surface)] p-3" key={group.key} style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-center justify-between gap-3"><h4 className="font-extrabold">{group.label}</h4><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">{t('patient.doctorProfile.available')}</span></div><div className="appointment-time-grid mt-2 grid gap-2">{group.slots.map((slot) => { const selected = selectedSlotId === slot.id; return <button aria-pressed={selected} className={`direction-ltr flex min-h-11 min-w-0 items-center justify-center rounded-lg border px-2 py-1.5 text-center text-sm font-bold transition ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white ring-2 ring-teal-200 ring-offset-2' : 'border-emerald-200 bg-white text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'}`} key={slot.id} onClick={() => setSelectedSlotId(slot.id)} type="button">{selected && <span aria-hidden="true" className="me-1">✓</span>}{formatSlot(slot.starts_at).time}</button> })}</div></li>)}</ol> : <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 text-center text-[var(--color-text-secondary)]">{t('patient.doctorProfile.noAvailability')}</div>}
          <button className="mt-5 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedSlotId} onClick={onContinue} type="button">{t('patient.doctorProfile.continue')}</button>
        </section>
      </div>
    </BookingPanel>
  )
}
