import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ProfileAvatar } from '../branding/ProfileAvatar'
import { LocationIcon } from '../icons/PatientHomeIcons'
import { getFeaturedDoctors, type FeaturedDoctor } from '../../services/doctorService'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'
import { Reveal } from './Reveal'
import { LoadingState } from '../feedback/LoadingState'

type LoadState = 'loading' | 'ready' | 'error'
const maximumHomepageDoctors = 4

/**
 * Featured doctors come from GET /api/v1/doctors/featured. Names and photos
 * are real records; ratings are omitted when the backend has no review data.
 */
export function FeaturedDoctorsSection() {
  const { i18n, t } = useTranslation()
  const [doctors, setDoctors] = useState<FeaturedDoctor[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const arabic = i18n.resolvedLanguage === 'ar'
  const visibleDoctors = doctors.slice(0, maximumHomepageDoctors)

  useEffect(() => {
    const controller = new AbortController()

    // Aborting on unmount prevents a completed request from updating a page
    // the user has already left.
    getFeaturedDoctors(controller.signal)
      .then((value) => {
        setDoctors(value)
        setState('ready')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState('error')
      })

    return () => controller.abort()
  }, [attempt])

  function retry() {
    setState('loading')
    setAttempt((value) => value + 1)
  }

  return (
    <section className="relative bg-[#ecfbf8] pb-28 pt-16" id="featured-doctors">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal direction="inline">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="public-eyebrow">{t('publicHome.doctors.eyebrow')}</p>
              <h2 className="public-heading">{t('publicHome.doctors.title')}</h2>
              <p className="mt-3 text-[var(--color-text-secondary)]">{t('publicHome.doctors.description')}</p>
            </div>
            <Link
              className="font-extrabold text-[var(--color-primary)] hover:underline"
              to={buildLoginPath(APPOINTMENT_SEARCH_ROUTE)}
            >
              {t('publicHome.doctors.viewAll')}{' '}
              <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        </Reveal>

        {state === 'loading' && (
          <div className="mt-8">
            <LoadingState message={t('publicHome.doctors.loading')} section />
          </div>
        )}

        {state === 'error' && (
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center">
            <p className="text-[var(--color-text-secondary)]" role="alert">
              {t('publicHome.doctors.loadError')}
            </p>
            <button
              className="mt-4 min-h-11 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              onClick={retry}
              type="button"
            >
              {t('publicHome.doctors.retry')}
            </button>
          </div>
        )}

        {state === 'ready' && (
          visibleDoctors.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleDoctors.map((doctor, index) => (
                <Reveal delay={index * 90} key={doctor.id}>
                  <DoctorCard arabic={arabic} doctor={doctor} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-6 text-[var(--color-text-secondary)]">
              {t('publicHome.doctors.empty')}
            </p>
          )
        )}
      </div>
      <div aria-hidden="true" className="section-wave section-wave--app absolute inset-x-0 bottom-0" />
    </section>
  )
}

function DoctorCard({ arabic, doctor }: { arabic: boolean; doctor: FeaturedDoctor }) {
  const { t } = useTranslation()
  // Specialization and city labels are the same records; only the language of the label changes.
  const specialty = arabic ? doctor.specialization.name_ar : doctor.specialization.name_en
  const location = arabic ? doctor.location.name_ar : doctor.location.name_en

  return (
    <article className="public-card overflow-hidden rounded-[1.6rem] border border-white bg-white shadow-[0_12px_32px_rgb(15_118_110/0.1)]">
      <div className="grid min-h-48 place-items-center bg-gradient-to-br from-[#e9f9f5] to-[#fffaf2] p-5">
        <ProfileAvatar
          alt={doctor.name}
          className="size-36 rounded-[1.8rem] text-3xl shadow-md"
          imageUrl={doctor.profile_image_url}
          name={doctor.name}
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-extrabold">{doctor.name}</h3>
        <p className="mt-1 text-sm font-bold text-[var(--color-primary)]">{specialty}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <LocationIcon className="size-4 text-[var(--color-primary)]" />
          {location}
        </p>
        {doctor.review_count > 0 && (
          <p className="mt-3 text-sm font-bold text-amber-600">
            <span aria-hidden="true">★</span> {doctor.average_rating.toFixed(1)}{' '}
            <span className="font-normal text-[var(--color-text-secondary)]">
              ({t('publicHome.doctors.reviewCount', { count: doctor.review_count })})
            </span>
          </p>
        )}
        <Link
          className="public-cta mt-5 block rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-extrabold text-white"
          to={buildLoginPath(`/patient/doctors/${doctor.id}`)}
        >
          {t('publicHome.doctors.book')}
        </Link>
      </div>
    </article>
  )
}
