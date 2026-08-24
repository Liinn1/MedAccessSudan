import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, ChevronIcon, LocationIcon, StethoscopeIcon } from '../../components/icons/PatientHomeIcons'
import { TimeSlot } from '../../components/patient/TimeSlot'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorProfile, type DoctorProfile } from '../../services/doctorService'
import { saveAppointmentDraft } from '../../utils/appointmentDraft'
import { buildLoginPath } from '../../utils/navigation'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

type PageState = 'loading' | 'success' | 'error' | 'notFound'

export function AppointmentSelectionPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { doctorId } = useParams()
  const numericDoctorId = Number(doctorId)
  const hasValidDoctorId = Number.isInteger(numericDoctorId) && numericDoctorId > 0
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [state, setState] = useState<PageState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')
  const arabic = i18n.resolvedLanguage === 'ar'

  useEffect(() => {
    if (!hasValidDoctorId) return
    const controller = new AbortController()
    getDoctorProfile(numericDoctorId, controller.signal)
      .then((profile) => {
        setDoctor(profile)
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath(`/patient/doctors/${numericDoctorId}/appointments`), { replace: true })
        } else if (error instanceof ApiError && error.status === 404) {
          setState('notFound')
        } else {
          setState('error')
        }
      })
    return () => controller.abort()
  }, [attempt, hasValidDoctorId, navigate, numericDoctorId])

  const formatSlot = (startsAt: string, endsAt: string) => {
    const locale = arabic ? 'ar-SD' : 'en'
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    const day = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', timeZone: SUDAN_TIME_ZONE }).format(start)
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE })
    return { day, time: `${time.format(start)} – ${time.format(end)}` }
  }

  function continueToConfirmation() {
    if (!selectedSlotId) return
    saveAppointmentDraft({ doctorId: numericDoctorId, availabilityId: selectedSlotId })
    setNotice(t('patient.appointmentSelection.confirmationPending'))
  }

  if (state === 'loading') return <PublicLayout><LoadingState contained message={t('patient.appointmentSelection.loading')} /></PublicLayout>
  if (state === 'error') return <PublicLayout><ErrorState contained message={t('patient.appointmentSelection.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PublicLayout>
  if (!hasValidDoctorId || state === 'notFound' || !doctor) return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PublicLayout>

  const specialization = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = arabic ? doctor.location.name_ar : doctor.location.name_en
  const initials = doctor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <PublicLayout>
      <div className="bg-[var(--color-background)] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate(`/patient/doctors/${numericDoctorId}`)} type="button"><ChevronIcon className="size-5 rtl:rotate-180" />{t('patient.appointmentSelection.back')}</button>

          <header className="mt-5 text-center">
            <p className="font-bold text-[var(--color-primary)]">{t('patient.appointmentSelection.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{t('patient.appointmentSelection.title')}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--color-text-secondary)]">{t('patient.appointmentSelection.description')}</p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="h-fit rounded-3xl border border-teal-100 bg-gradient-to-b from-[var(--color-primary-surface)] to-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                {doctor.profile_image_url ? <img alt={t('patient.doctorProfile.imageAlt', { name: doctor.name })} className="size-20 shrink-0 rounded-2xl object-cover" src={doctor.profile_image_url} /> : <div aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-xl font-black text-white">{initials}</div>}
                <div className="min-w-0"><h2 className="break-words text-xl font-extrabold">{doctor.name}</h2><p className="mt-1 flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]"><StethoscopeIcon className="size-4 shrink-0" />{specialization}</p></div>
              </div>
              <p className="mt-5 flex items-start gap-2 border-t border-teal-100 pt-4 text-sm text-[var(--color-text-secondary)]"><LocationIcon className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />{doctor.clinic_name || location}</p>
            </aside>

            <section className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="appointment-times-title">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold" id="appointment-times-title"><CalendarIcon className="size-6 text-[var(--color-primary)]" />{t('patient.appointmentSelection.availableTimes')}</h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('patient.appointmentSelection.timezone')}</p>
              {doctor.availability.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{doctor.availability.map((slot, index) => { const formatted = formatSlot(slot.starts_at, slot.ends_at); return <div key={slot.id} style={{ animationDelay: `${index * 55}ms` }}><TimeSlot day={formatted.day} onSelect={() => { setSelectedSlotId(slot.id); setNotice('') }} selected={selectedSlotId === slot.id} selectedLabel={t('patient.appointmentSelection.selected')} time={formatted.time} /></div> })}</div> : <div className="mt-5 rounded-2xl bg-[var(--color-background)] p-7 text-center text-[var(--color-text-secondary)]">{t('patient.doctorProfile.noAvailability')}</div>}

              <button className="mt-6 min-h-14 w-full rounded-full bg-[var(--color-primary)] px-6 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none" disabled={!selectedSlotId} onClick={continueToConfirmation} type="button">{t('patient.appointmentSelection.continue')}</button>
              <p aria-live="polite" className="mt-3 min-h-6 text-center text-sm font-semibold text-[var(--color-primary)]">{notice}</p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
