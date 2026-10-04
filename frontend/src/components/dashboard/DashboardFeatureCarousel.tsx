import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronIcon } from '../icons/PatientHomeIcons'

export interface DashboardFeatureSlide {
  id: string
  image: string
  imagePosition?: string
  label: string
  title: string
  description: string
  cta: string
  to?: string
  onSelect?: () => void
}

interface DashboardFeatureCarouselProps {
  title: string
  slides: DashboardFeatureSlide[]
  carouselLabel: string
  carouselDescription: string
  previousLabel: string
  nextLabel: string
  paginationLabel: string
  slideLabel: (number: number) => string
  isRtl: boolean
}

const ROTATION_INTERVAL_MS = 5000

export function DashboardFeatureCarousel({
  title,
  slides,
  carouselLabel,
  carouselDescription,
  previousLabel,
  nextLabel,
  paginationLabel,
  slideLabel,
  isRtl,
}: DashboardFeatureCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const hasMultipleSlides = slides.length > 1

  useEffect(() => {
    if (!hasMultipleSlides || isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [hasMultipleSlides, isPaused, slides.length])

  const showPrevious = () => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  const showNext = () => setActiveIndex((current) => (current + 1) % slides.length)

  return (
    <article
      aria-label={carouselLabel}
      aria-roledescription={carouselDescription}
      className="dashboard-home-card dashboard-home-card--compact min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
      }}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">{title}</h2>
        {hasMultipleSlides && (
          <div className="flex gap-2">
            <button aria-label={previousLabel} className="grid size-9 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none" onClick={showPrevious} type="button">
              <ChevronIcon className={`size-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            <button aria-label={nextLabel} className="grid size-9 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none" onClick={showNext} type="button">
              <ChevronIcon className={`size-4 ${isRtl ? '' : 'rotate-180'}`} />
            </button>
          </div>
        )}
      </div>

      <div aria-live="off" className="relative min-h-[20rem] overflow-hidden rounded-2xl bg-slate-900 sm:min-h-[22rem] xl:min-h-[24rem]">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex
          const actionClassName = "mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-white/80 bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--color-primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-surface)] hover:text-[#0F766E] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none"
          const actionContent = <>{slide.cta}<ChevronIcon className={`size-4 ${isRtl ? '' : 'rotate-180'}`} /></>

          return (
            <div aria-hidden={!isActive} className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${isActive ? 'z-10 scale-100 opacity-100' : 'pointer-events-none scale-[1.015] opacity-0'}`} key={slide.id}>
              <img alt="" className={`absolute inset-0 size-full object-cover ${slide.imagePosition ?? 'object-center'}`} src={slide.image} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/58 to-teal-900/15 sm:bg-gradient-to-r sm:from-slate-950/95 sm:via-slate-950/65 sm:to-transparent rtl:sm:bg-gradient-to-l" />
              <div className="relative flex min-h-[20rem] max-w-xl flex-col justify-end p-5 text-white sm:min-h-[22rem] sm:justify-center sm:p-7 xl:min-h-[24rem]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-200">{slide.label}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{slide.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-100 sm:text-base">{slide.description}</p>
                {slide.to ? (
                  <Link className={actionClassName} tabIndex={isActive ? 0 : -1} to={slide.to}>{actionContent}</Link>
                ) : (
                  <button className={actionClassName} onClick={slide.onSelect} tabIndex={isActive ? 0 : -1} type="button">{actionContent}</button>
                )}
              </div>
            </div>
          )
        })}

        {hasMultipleSlides && (
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2" role="group" aria-label={paginationLabel}>
            {slides.map((slide, index) => (
              <button
                aria-label={slideLabel(index + 1)}
                aria-pressed={index === activeIndex}
                className={`h-2 rounded-full border border-white/70 transition-[width,background-color] duration-300 motion-reduce:transition-none ${index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/35 hover:bg-white/70'}`}
                key={slide.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
