import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CalendarIcon, ChevronIcon, LocationIcon, StethoscopeIcon } from '../../components/icons/PatientHomeIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorProfile, type DoctorProfile } from '../../services/doctorService'
import { buildDoctorBookingPath, buildLoginPath } from '../../utils/navigation'
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
  const numericDoctorId = Number(doctorId)
  const hasValidDoctorId = Number.isInteger(numericDoctorId) && numericDoctorId > 0
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
    return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PublicLayout>
  }

  if (state === 'loading') {
    return <PublicLayout><LoadingState contained message={t('patient.doctorProfile.loading')} /></PublicLayout>
  }

  if (state === 'error') {
    return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.error')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /></PublicLayout>
  }

  if (state === 'notFound' || !doctor) {
    return <PublicLayout><ErrorState contained message={t('patient.doctorProfile.notFound')} onRetry={() => navigate('/patient/doctors/search')} retryLabel={t('patient.doctorProfile.backToSearch')} /></PublicLayout>
  }

  const specialization = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = arabic ? doctor.location.name_ar : doctor.location.name_en
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
    <PublicLayout>
      <div className="bg-[var(--color-background)] px-5 py-8 sm:px-8 sm:py-12">
        <article className="mx-auto max-w-5xl">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => navigate(-1)} type="button">
            <ChevronIcon className="size-5 rtl:rotate-180" />
            {t('patient.doctorProfile.back')}
          </button>

          <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-[0_18px_45px_rgb(15_118_110/0.08)]">
            <div className="bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-9">
              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-start">
                {doctor.profile_image_url ? <img alt={t('patient.doctorProfile.imageAlt', { name: doctor.name })} className="size-28 shrink-0 rounded-3xl object-cover shadow-md sm:size-36" src={doctor.profile_image_url} /> : <div aria-hidden="true" className="grid size-28 shrink-0 place-items-center rounded-3xl bg-[var(--color-primary)] text-3xl font-black text-white shadow-md sm:size-36 sm:text-4xl">{initials}</div>}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-[var(--color-success-surface)] px-3 py-1 text-sm font-bold text-emerald-700">{t('patient.doctorProfile.verified')}</span>
                  <h1 className="mt-3 break-words text-3xl font-black text-[var(--color-text-primary)] sm:text-4xl">{doctor.name}</h1>
                  <p className="mt-2 flex items-center justify-center gap-2 font-bold text-[var(--color-primary)] sm:justify-start rtl:sm:justify-start"><StethoscopeIcon className="size-5 shrink-0" />{specialization}</p>
                  <p className="mt-2 flex items-center justify-center gap-2 text-[var(--color-text-secondary)] sm:justify-start rtl:sm:justify-start"><LocationIcon className="size-5 shrink-0 text-[var(--color-primary)]" />{doctor.clinic_name || location}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_1.15fr]">
              <section aria-labelledby="doctor-about-title">
                <h2 className="text-2xl font-extrabold" id="doctor-about-title">{t('patient.doctorProfile.about')}</h2>
                <p className="mt-4 leading-relaxed text-[var(--color-text-secondary)]">{biography}</p>
                {doctor.review_count > 0 && <div className="mt-5 rounded-2xl bg-amber-50 p-4"><p className="font-extrabold text-amber-700">★ {doctor.average_rating.toFixed(1)} <span className="font-normal text-[var(--color-text-secondary)]">({t('publicHome.doctors.reviewCount', { count: doctor.review_count })})</span></p>{doctor.reviews.map((review) => review.comment && <blockquote className="mt-3 border-s-2 border-amber-300 ps-3 text-sm text-[var(--color-text-secondary)]" key={review.id}>{review.comment}</blockquote>)}</div>}
                <dl className="mt-6 space-y-4 rounded-2xl bg-[var(--color-background)] p-5">
                  <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.specialization')}</dt><dd className="mt-1 font-semibold">{specialization}</dd></div>
                  <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.location')}</dt><dd className="mt-1 font-semibold">{location}</dd></div>
                  {doctor.clinic_name && <div><dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.doctorProfile.clinic')}</dt><dd className="mt-1 font-semibold">{doctor.clinic_name}</dd></div>}
                </dl>
              </section>

              <section aria-labelledby="doctor-availability-title">
                <h2 className="flex items-center gap-2 text-2xl font-extrabold" id="doctor-availability-title"><CalendarIcon className="size-6 text-[var(--color-primary)]" />{t('patient.doctorProfile.availability')}</h2>
                {availabilityGroups.length ? <ol className="mt-4 space-y-3">{availabilityGroups.map((group, index) => <li className="service-card-enter rounded-xl border border-emerald-100 bg-[var(--color-success-surface)] p-3" key={group.key} style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-center justify-between gap-3"><h3 className="font-extrabold text-[var(--color-text-primary)]">{group.label}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">{t('patient.doctorProfile.available')}</span></div><div className="appointment-time-grid mt-2 grid gap-2">{group.slots.map((slot) => <span className="direction-ltr flex min-h-11 min-w-0 items-center justify-center rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-[var(--color-text-primary)]" key={slot.id}>{formatSlot(slot.starts_at).time}</span>)}</div></li>)}</ol> : <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 text-center text-[var(--color-text-secondary)]">{t('patient.doctorProfile.noAvailability')}</div>}
                <button className="mt-5 min-h-14 w-full rounded-full bg-[var(--color-primary)] px-6 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none" disabled={!doctor.availability.length} onClick={() => navigate(buildDoctorBookingPath(numericDoctorId))} type="button">{t('patient.doctorProfile.book')}</button>
              </section>
            </div>
          </section>
        </article>
      </div>
    </PublicLayout>
  )
}
