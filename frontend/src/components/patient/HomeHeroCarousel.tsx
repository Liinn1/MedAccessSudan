import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import careTeamImage from '../../assets/home-carousel/care-team.jpg'
import surgicalCareImage from '../../assets/home-carousel/surgical-care.jpg'
import medicalTechnologyImage from '../../assets/home-carousel/medical-technology.jpg'

const slides = [
  { key: 'sudaneseHealthcare', image: null },
  { key: 'careTeam', image: careTeamImage },
  { key: 'surgicalCare', image: surgicalCareImage },
  { key: 'medicalTechnology', image: medicalTechnologyImage },
] as const

export function HomeHeroCarousel() {
  const { t } = useTranslation()
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [activeSlide, isPaused])

  return (
    <section
      aria-label={t('patient.home.carousel.label')}
      aria-roledescription={t('patient.home.carousel.roleDescription')}
      className="relative mt-5 h-40 overflow-hidden rounded-3xl bg-[var(--color-primary)] text-white shadow-sm sm:mt-6 sm:h-44 lg:h-48"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
      }}
      onFocusCapture={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div aria-live="off">
        {slides.map((slide, index) => {
          const isActive = index === activeSlide
          return (
            <article aria-hidden={!isActive} className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${isActive ? 'z-[1] opacity-100' : 'pointer-events-none opacity-0'}`} key={slide.key}>
              {slide.image && <img alt={t(`patient.home.carousel.slides.${slide.key}.imageAlt`)} className="absolute inset-0 size-full object-cover" loading={index === 1 ? 'eager' : 'lazy'} src={slide.image} />}
              <div className={`absolute inset-0 ${slide.image ? 'bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-slate-900/10 rtl:bg-gradient-to-l' : 'bg-[var(--color-primary)]'}`} />
              <div className="relative flex h-full max-w-3xl flex-col justify-center px-6 pb-7 pt-5 sm:px-8 lg:px-10">
                <h2 className="text-xl font-extrabold leading-tight sm:text-2xl lg:text-3xl">{t(`patient.home.carousel.slides.${slide.key}.title`)}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">{t(`patient.home.carousel.slides.${slide.key}.description`)}</p>
              </div>
            </article>
          )
        })}
      </div>

      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2" role="group" aria-label={t('patient.home.carousel.paginationLabel')}>
        {slides.map((slide, index) => (
          <button aria-label={t('patient.home.carousel.goToSlide', { number: index + 1 })} aria-pressed={index === activeSlide} className={`size-2.5 rounded-full border border-white transition motion-reduce:transition-none ${index === activeSlide ? 'w-6 bg-white' : 'bg-white/35 hover:bg-white/70'}`} key={slide.key} onClick={() => setActiveSlide(index)} type="button" />
        ))}
      </div>
    </section>
  )
}
