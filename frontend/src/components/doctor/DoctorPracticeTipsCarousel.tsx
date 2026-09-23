import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import manageAvailabilityImage from '../../assets/doctor-tips/manage-availability.jpg'
import planAppointmentsImage from '../../assets/doctor-tips/plan-appointments.jpg'
import updateProfileImage from '../../assets/doctor-tips/update-profile.jpg'
import { ChevronIcon } from '../icons/PatientHomeIcons'

const PRACTICE_TIPS = [
  { id: 'availability', image: manageAvailabilityImage, route: '/doctor/availability', position: 'object-center' },
  { id: 'profile', image: updateProfileImage, route: '/doctor/profile', position: 'object-[center_28%]' },
  { id: 'appointments', image: planAppointmentsImage, route: '/doctor/appointments', position: 'object-center' },
] as const

const ROTATION_INTERVAL_MS = 5000

export function DoctorPracticeTipsCarousel() {
  const { i18n, t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const isRtl = i18n.dir() === 'rtl'

  useEffect(() => {
    if (isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PRACTICE_TIPS.length)
    }, ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isPaused])

  const showPrevious = () => setActiveIndex((current) => (current - 1 + PRACTICE_TIPS.length) % PRACTICE_TIPS.length)
  const showNext = () => setActiveIndex((current) => (current + 1) % PRACTICE_TIPS.length)

  return (
    <article
      aria-label={t('doctor.dashboard.tips.carouselLabel')}
      aria-roledescription={t('doctor.dashboard.tips.carousel')}
      className="dashboard-card-enter min-w-0 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-sm sm:p-4"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
      }}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">{t('doctor.dashboard.tips.title')}</h2>
        <div className="flex gap-2">
          <button aria-label={t('doctor.dashboard.tips.previous')} className="grid size-9 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none" onClick={showPrevious} type="button">
            <ChevronIcon className={`size-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
          <button aria-label={t('doctor.dashboard.tips.next')} className="grid size-9 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none" onClick={showNext} type="button">
            <ChevronIcon className={`size-4 ${isRtl ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      <div aria-live="off" className="relative min-h-[20rem] overflow-hidden rounded-2xl bg-slate-900 sm:min-h-[22rem] xl:min-h-[24rem]">
        {PRACTICE_TIPS.map((tip, index) => {
          const isActive = index === activeIndex
          return (
            <div aria-hidden={!isActive} className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${isActive ? 'z-10 scale-100 opacity-100' : 'pointer-events-none scale-[1.015] opacity-0'}`} key={tip.id}>
              <img alt="" className={`absolute inset-0 size-full object-cover ${tip.position}`} src={tip.image} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/58 to-teal-900/15 sm:bg-gradient-to-r sm:from-slate-950/95 sm:via-slate-950/65 sm:to-transparent rtl:sm:bg-gradient-to-l" />
              <div className="relative flex min-h-[20rem] max-w-xl flex-col justify-end p-5 text-white sm:min-h-[22rem] sm:justify-center sm:p-7 xl:min-h-[24rem]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-200">{t(`doctor.dashboard.tips.slides.${tip.id}.label`)}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{t(`doctor.dashboard.tips.slides.${tip.id}.title`)}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-100 sm:text-base">{t(`doctor.dashboard.tips.slides.${tip.id}.description`)}</p>
                <Link className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-white/80 bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--color-primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-surface)] hover:text-[#0F766E] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none" tabIndex={isActive ? 0 : -1} to={tip.route}>
                  {t(`doctor.dashboard.tips.slides.${tip.id}.cta`)}
                  <ChevronIcon className={`size-4 ${isRtl ? '' : 'rotate-180'}`} />
                </Link>
              </div>
            </div>
          )
        })}

        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2" role="group" aria-label={t('doctor.dashboard.tips.pagination')}>
          {PRACTICE_TIPS.map((tip, index) => (
            <button
              aria-label={t('doctor.dashboard.tips.goToSlide', { number: index + 1 })}
              aria-pressed={index === activeIndex}
              className={`h-2 rounded-full border border-white/70 transition-[width,background-color] duration-300 motion-reduce:transition-none ${index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/35 hover:bg-white/70'}`}
              key={tip.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </article>
  )
}
