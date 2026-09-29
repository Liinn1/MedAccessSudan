import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import careTeam from '../../assets/home-carousel/care-team.jpg'
import surgery from '../../assets/home-carousel/surgical-care.jpg'
import technology from '../../assets/home-carousel/medical-technology.jpg'
import { ProfileIcon, StethoscopeIcon, VisitIcon, CalendarIcon } from '../icons/PatientHomeIcons'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'

const slides = [
  { key: 'access', image: careTeam },
  { key: 'providers', image: surgery },
  { key: 'wherever', image: technology },
] as const

const trustItems = [
  { key: 'verified', icon: ProfileIcon },
  { key: 'booking', icon: CalendarIcon },
  { key: 'homeVisits', icon: VisitIcon },
  { key: 'family', icon: StethoscopeIcon },
] as const

const carouselIntervalMs = 5000

/**
 * Homepage hero with an accessible, self-advancing image carousel.
 * Rotation pauses while the user points at or focuses the controls.
 */
export function PublicHeroCarousel() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(
      () => setActive((value) => (value + 1) % slides.length),
      carouselIntervalMs,
    )

    return () => window.clearTimeout(timer)
  }, [active, paused])

  return (
    <section aria-label={t('publicHome.hero.label')} className="public-hero relative overflow-hidden bg-[#fbfffe]" id="home">
      <span aria-hidden="true" className="public-hero-orb public-hero-orb--one" />
      <span aria-hidden="true" className="public-hero-orb public-hero-orb--two" />
      <div className="relative mx-auto grid min-h-[41rem] max-w-7xl items-center gap-10 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-28 lg:pt-16">
        {/* The key restarts the restrained copy entrance for each selected slide. */}
        <div
          className="public-hero-copy relative z-10 max-w-[36rem]"
          key={`${active}-${t('publicHome.hero.title')}`}
        >
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--color-primary)]">{t('publicHome.hero.eyebrow')}</p>
          <h1 className="public-hero-title mt-2.5 max-w-xl font-black text-slate-950">{t('publicHome.hero.title')}</h1>
          <p className="mt-5 max-w-[34rem] text-base leading-7 text-[var(--color-text-secondary)] sm:text-[1.05rem]">{t('publicHome.hero.description')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="public-cta inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 font-extrabold text-white shadow-[0_12px_30px_rgb(13_148_136/0.2)]"
              to={buildLoginPath(APPOINTMENT_SEARCH_ROUTE)}
            >
              {t('publicHome.hero.findDoctor')}
              <span aria-hidden="true" className="ms-2 rtl:rotate-180">→</span>
            </Link>
            <a
              className="public-cta inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-white px-6 font-extrabold text-[var(--color-primary)]"
              href="#services"
            >
              {t('publicHome.hero.exploreServices')}
            </a>
          </div>
          <ul className="mt-7 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {trustItems.map(({ key, icon: Icon }) => (
              <li className="flex items-center gap-2 text-xs font-bold leading-tight text-slate-700" key={key}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-[var(--color-primary)]">
                  <Icon className="size-4.5" />
                </span>
                {t(`publicHome.hero.trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative min-h-[24rem] sm:min-h-[31rem]"
          onBlurCapture={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="public-hero-frame absolute inset-0 overflow-hidden bg-teal-50 shadow-[0_28px_70px_rgb(15_118_110/0.14)]">
            {slides.map((slide, index) => (
              <img
                alt={t(`publicHome.hero.slides.${slide.key}.alt`)}
                aria-hidden={active !== index}
                className={`absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${active === index ? 'z-[1] opacity-100' : ''}`}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                key={slide.key}
                loading="eager"
                src={slide.image}
              />
            ))}
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-teal-950/20 via-transparent to-white/5" />
          </div>
          <p className="public-hand-note public-hero-note absolute z-[3] text-center text-lg font-bold leading-tight text-teal-950">
            {t('publicHome.hero.note')}
            <span aria-hidden="true" className="block text-2xl text-[var(--color-primary)]">♡</span>
          </p>
          {/* translate-x is physical, so RTL needs the opposite offset to stay centered. */}
          <div
            aria-label={t('publicHome.hero.pagination')}
            className="absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-white/85 p-2 shadow-sm backdrop-blur rtl:translate-x-1/2"
            role="group"
          >
            {slides.map((slide, index) => (
              <button
                aria-current={active === index || undefined}
                aria-label={t('publicHome.hero.showSlide', { number: index + 1 })}
                aria-pressed={active === index}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${active === index ? 'w-8 bg-[var(--color-primary)]' : 'w-2.5 bg-slate-300 hover:bg-teal-300'}`}
                key={slide.key}
                onClick={() => setActive(index)}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="section-wave section-wave--mint absolute inset-x-0 bottom-0" />
    </section>
  )
}
