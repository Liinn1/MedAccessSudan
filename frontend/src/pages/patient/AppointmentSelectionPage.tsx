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
import { loadAppointmentDraft, saveAppointmentDraft } from '../../utils/appointmentDraft'
import { buildDoctorBookingPath, buildLoginPath } from '../../utils/navigation'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

type PageState = 'loading' | 'success' | 'error' | 'notFound'
const sudanDateKey = (value: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(value))

export function AppointmentSelectionPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { doctorId } = useParams()
  const numericDoctorId = Number(doctorId)
  const hasValidDoctorId = Number.isInteger(numericDoctorId) && numericDoctorId > 0
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [state, setState] = useState<PageState>('loading')
  const [attempt, setAttempt] = useState(0)
  const arabic = i18n.resolvedLanguage === 'ar'

  useEffect(() => {
    if (!hasValidDoctorId) return
    const controller = new AbortController()
    getDoctorProfile(numericDoctorId, controller.signal)
      .then((profile) => {
        const draft = loadAppointmentDraft()
        const preservedSlot = draft?.doctorId === numericDoctorId
          ? profile.availability.find((slot) => slot.id === draft.availabilityId || slot.starts_at === draft.availabilityId)
          : undefined
        setDoctor(profile)
        setSelectedSlotId(preservedSlot?.id ?? null)
        setSelectedDate(preservedSlot ? sudanDateKey(preservedSlot.starts_at) : profile.availability[0] ? sudanDateKey(profile.availability[0].starts_at) : null)
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          navigate(buildLoginPath(buildDoctorBookingPath(numericDoctorId)), { replace: true })
        } else if (error instanceof ApiError && error.status === 404) {
          setState('notFound')
        } else {
          setState('error')
        }
      })
    return () => controller.abort()
  }, [attempt, hasValidDoctorId, navigate, numericDoctorId])

  const formatSlot = (startsAt: string) => {
    const locale = arabic ? 'ar-SD' : 'en'
    const start = new Date(startsAt)
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: SUDAN_TIME_ZONE }).format(start)
    const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: SUDAN_TIME_ZONE }).format(start)
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(start)
    return { weekday, date, time }
  }

  function continueToConfirmation() {
    if (!selectedSlotId) return
    saveAppointmentDraft({ doctorId: numericDoctorId, availabilityId: selectedSlotId })
    navigate('/patient/appointments/confirm')
  }

  if (!hasValidDoctorId) return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PublicLayout>
  if (state === 'loading') return <PublicLayout><LoadingState contained message={t('patient.appointmentSelection.loading')} /></PublicLayout>
  if (state === 'error') return <PublicLayout><ErrorState contained message={t('patient.appointmentSelection.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PublicLayout>
  if (state === 'notFound' || !doctor) return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PublicLayout>

  const specialization = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = arabic ? doctor.location.name_ar : doctor.location.name_en
  const initials = doctor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const dateGroups = doctor.availability.reduce<Array<{ key: string; weekday: string; date: string; slots: typeof doctor.availability }>>((groups, slot) => {
    const key = sudanDateKey(slot.starts_at)
    const existing = groups.find((group) => group.key === key)
    if (existing) existing.slots.push(slot)
    else { const formatted = formatSlot(slot.starts_at); groups.push({ key, weekday: formatted.weekday, date: formatted.date, slots: [slot] }) }
    return groups
  }, [])
  const visibleSlots = dateGroups.find((group) => group.key === selectedDate)?.slots ?? []
  const selectedSlot = doctor.availability.find((slot) => slot.id === selectedSlotId)
  const selectedDateGroup = dateGroups.find((group) => group.key === selectedDate)

  return (
    <PublicLayout>
      <div className="bg-[var(--color-background)] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate(`/patient/doctors/${numericDoctorId}`)} type="button"><ChevronIcon className="size-5 rtl:rotate-180" />{t('patient.appointmentSelection.back')}</button>

          <header className="mt-5 text-center">
            <p className="font-bold text-[var(--color-primary)]">{t('patient.appointmentSelection.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{t('patient.appointmentSelection.title')}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--color-text-secondary)]">{t('patient.appointmentSelection.description')}</p>
          </header>

          <div className="mt-7 space-y-5">
            <aside className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-4 shadow-sm rtl:bg-gradient-to-l sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
              <div className="flex items-center gap-4">
                {doctor.profile_image_url ? <img alt={t('patient.doctorProfile.imageAlt', { name: doctor.name })} className="size-20 shrink-0 rounded-2xl object-cover" src={doctor.profile_image_url} /> : <div aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-xl font-black text-white">{initials}</div>}
                <div className="min-w-0"><h2 className="break-words text-xl font-extrabold">{doctor.name}</h2><p className="mt-1 flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]"><StethoscopeIcon className="size-4 shrink-0" />{specialization}</p></div>
              </div>
              <p className="mt-4 flex items-start gap-2 border-t border-teal-100 pt-3 text-sm text-[var(--color-text-secondary)] sm:mt-0 sm:border-t-0 sm:border-s sm:border-teal-100 sm:ps-6 sm:pt-0"><LocationIcon className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />{doctor.clinic_name || location}</p>
            </aside>

            <section className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="appointment-times-title">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold" id="appointment-times-title"><CalendarIcon className="size-6 text-[var(--color-primary)]" />{t('patient.appointmentSelection.chooseDate')}</h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('patient.appointmentSelection.timezone')}</p>
              {doctor.availability.length ? <>
                <div aria-label={t('patient.appointmentSelection.chooseDate')} className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2" role="group">
                  {dateGroups.map((group) => <button aria-pressed={selectedDate === group.key} className={`min-h-14 min-w-[5.75rem] shrink-0 snap-start rounded-xl border px-3 py-2 text-center text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${selectedDate === group.key ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-white hover:border-teal-300'}`} key={group.key} onClick={() => { setSelectedDate(group.key); setSelectedSlotId(null) }} type="button"><span className="block font-extrabold">{group.weekday}</span><span className="block text-xs font-semibold">{group.date}</span>{selectedDate === group.key && <span className="sr-only">{t('patient.appointmentSelection.selected')}</span>}</button>)}
                </div>
                <h3 className="mt-3 text-lg font-extrabold">{t('patient.appointmentSelection.availableTimes')}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('patient.appointmentSelection.chooseTime')}</p>
                <div className="appointment-time-grid mt-3 grid gap-2">
                  {visibleSlots.map((slot) => <TimeSlot key={slot.id} onSelect={() => setSelectedSlotId(slot.id)} selected={selectedSlotId === slot.id} selectedLabel={t('patient.appointmentSelection.selected')} time={formatSlot(slot.starts_at).time} unavailableLabel={t('patient.appointmentSelection.unavailable')} />)}
                </div>
                {selectedSlot && selectedDateGroup && <div className="feedback-enter mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-[var(--color-primary-surface)] px-4 py-3 motion-reduce:animate-none" role="status"><span className="text-sm font-bold text-[var(--color-primary)]">{t('patient.appointmentSelection.selectedSummaryLabel')}</span><span className="font-semibold">{t('patient.appointmentSelection.selectedSummary', { date: `${selectedDateGroup.weekday}, ${selectedDateGroup.date}`, time: formatSlot(selectedSlot.starts_at).time })}</span></div>}
              </> : <div className="mt-5 rounded-2xl bg-[var(--color-background)] p-7 text-center text-[var(--color-text-secondary)]">{t('patient.doctorProfile.noAvailability')}</div>}

              <button className="mt-6 min-h-14 w-full rounded-full bg-[var(--color-primary)] px-6 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none" disabled={!selectedSlotId} onClick={continueToConfirmation} type="button">{t('patient.appointmentSelection.continue')}</button>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
