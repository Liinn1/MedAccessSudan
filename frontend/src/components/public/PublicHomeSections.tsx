import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import aboutImage from '../../assets/public-home/about-sudan.jpg'
import clinicImage from '../../assets/public-home/clinic-visits.jpg'
import homeVisitImage from '../../assets/public-home/home-visits.jpg'
import laboratoryImage from '../../assets/public-home/laboratory-tests.jpg'
import {
  GlobeIcon,
  HomeIcon,
  LaboratoryIcon,
  ProfileIcon,
  StethoscopeIcon,
  VisitIcon,
} from '../icons/PatientHomeIcons'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'
import { AppStoreBadges } from './AppStoreBadges'
import { BotanicalDecoration } from './BotanicalDecoration'
import { Reveal } from './Reveal'

/** Homepage storytelling sections composed by PublicHomePage. */

/** Shared by the service cards and the temporary phone UI preview. */
const services = [
  {
    key: 'clinic',
    icon: StethoscopeIcon,
    image: clinicImage,
    to: buildLoginPath(APPOINTMENT_SEARCH_ROUTE),
    accent: 'bg-teal-50 text-teal-700',
  },
  {
    key: 'homeVisit',
    icon: VisitIcon,
    image: homeVisitImage,
    to: buildLoginPath('/patient/home-visits'),
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'laboratory',
    icon: LaboratoryIcon,
    image: laboratoryImage,
    to: null,
    accent: 'bg-violet-50 text-violet-700',
  },
] as const

const principles = [
  { key: 'people', icon: ProfileIcon },
  { key: 'reliable', icon: StethoscopeIcon },
  { key: 'accessible', icon: GlobeIcon },
  { key: 'together', icon: HomeIcon },
] as const

interface ServicesSectionProps {
  onComingSoon: (featureName: string) => void
}

const cardRevealStaggerMs = 90

export function ServicesSection({ onComingSoon }: ServicesSectionProps) {
  const { t } = useTranslation()

  return (
    <section className="public-services-section relative pb-24 pt-8" id="services">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal direction="inline">
          <p className="public-eyebrow">{t('publicHome.services.eyebrow')}</p>
          <h2 className="public-heading">{t('publicHome.services.title')}</h2>
          <p className="mt-3 max-w-xl text-[var(--color-text-secondary)]">
            {t('publicHome.services.description')}
          </p>
        </Reveal>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Reveal delay={index * cardRevealStaggerMs} key={service.key}>
              <ServiceCard onComingSoon={onComingSoon} service={service} />
            </Reveal>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="section-wave section-wave--white absolute inset-x-0 bottom-0" />
    </section>
  )
}

type Service = (typeof services)[number]

function ServiceCard({
  service,
  onComingSoon,
}: {
  service: Service
  onComingSoon: ServicesSectionProps['onComingSoon']
}) {
  const { t } = useTranslation()
  const { key, icon: Icon, image, to, accent } = service
  const actionLabel = t(`publicHome.services.items.${key}.action`)
  const actionClassName = 'mt-auto grid size-10 place-items-center rounded-full border border-teal-100 text-xl font-bold text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] rtl:rotate-180'

  return (
    <article className="public-service-card public-card group grid h-full min-h-[17rem] grid-cols-[1fr_42%] overflow-hidden rounded-[1.7rem] border border-white/80 bg-white shadow-[0_12px_35px_rgb(15_118_110/0.09)]">
      <div className="flex flex-col p-5 sm:p-6">
        <span className={`grid size-11 place-items-center rounded-2xl ${accent}`}>
          <Icon className="size-5.5" />
        </span>
        <h3 className="mt-4 text-xl font-extrabold">{t(`publicHome.services.items.${key}.title`)}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          {t(`publicHome.services.items.${key}.description`)}
        </p>

        {to ? (
          <Link aria-label={actionLabel} className={actionClassName} to={to}>→</Link>
        ) : (
          // Laboratory booking has no route yet; the dialog is deliberately truthful.
          <button
            aria-label={actionLabel}
            className={actionClassName}
            onClick={() => onComingSoon(t(`publicHome.services.items.${key}.title`))}
            type="button"
          >
            →
          </button>
        )}
      </div>
      <img
        alt=""
        className="h-full min-h-[17rem] w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        loading="lazy"
        src={image}
      />
    </article>
  )
}

export function AboutSection() {
  const { t } = useTranslation()

  return (
    <section className="public-about relative overflow-hidden bg-white pb-28 pt-14" id="about">
      <span aria-hidden="true" className="public-about-blob" />

      {/* Heading, image, and story stay one DOM tree. CSS grid-row reorders them on small screens. */}
      <div className="public-about-layout relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
        <Reveal className="public-about-copy lg:pe-8" direction="inline">
          <div className="public-about-heading">
            <p className="public-eyebrow">{t('publicHome.about.eyebrow')}</p>
            <h2 className="public-heading max-w-xl">{t('publicHome.about.title')}</h2>
          </div>
          <div className="public-about-story">
            <p className="mt-5 max-w-xl leading-7 text-[var(--color-text-secondary)]">
              {t('publicHome.about.storyOne')}
            </p>
            <p className="mt-3 max-w-xl leading-7 text-[var(--color-text-secondary)]">
              {t('publicHome.about.storyTwo')}
            </p>
            <a
              className="public-cta mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-6 font-bold text-white"
              href="#contact"
            >
              {t('publicHome.about.cta')}
            </a>
          </div>
        </Reveal>

        <Reveal className="public-about-composition relative" delay={100}>
          <BotanicalDecoration variant="about" />
          <div className="public-about-frame relative z-10 overflow-hidden shadow-[0_24px_60px_rgb(15_118_110/0.13)]">
            <img
              alt={t('publicHome.about.imageAlt')}
              className="h-[22rem] w-full object-cover sm:h-[28rem]"
              loading="lazy"
              src={aboutImage}
            />
          </div>
          {/* Physical left keeps the quote attached to the photo in both LTR and RTL. */}
          <blockquote className="absolute -left-3 top-4 z-20 max-w-[13rem] rounded-[1.7rem] bg-white/95 p-5 text-lg font-extrabold leading-snug text-slate-800 shadow-xl backdrop-blur sm:left-1 sm:top-8">
            {t('publicHome.about.quote')}
          </blockquote>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-12 grid max-w-7xl grid-cols-2 gap-5 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
        {principles.map(({ key, icon: Icon }, index) => (
          <Reveal delay={index * 80} key={key}>
            <div className="flex flex-col items-center text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-[var(--color-primary)]">
                <Icon className="size-6" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-slate-800">
                {t(`publicHome.about.principles.${key}`)}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
      <div aria-hidden="true" className="section-wave section-wave--mint absolute inset-x-0 bottom-0" />
    </section>
  )
}

export function AppPromoSection() {
  const { t } = useTranslation()

  return (
    <section className="public-app-promo relative overflow-hidden bg-[#ddf8f3] pb-24 pt-18">
      <span aria-hidden="true" className="public-app-cream" />

      <div className="public-app-layout relative mx-auto grid min-h-[34rem] max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-10">
        <Reveal className="public-app-copy" direction="inline">
          <p className="public-eyebrow">{t('publicHome.app.eyebrow')}</p>
          <h2 className="public-heading max-w-lg">{t('publicHome.app.title')}</h2>
          <p className="mt-4 max-w-md leading-7 text-[var(--color-text-secondary)]">
            {t('publicHome.app.description')}
          </p>
          <AppStoreBadges />
        </Reveal>

        <Reveal className="public-app-visual relative min-h-[32rem]" delay={100}>
          {/* Leaves and phone share one positioning context so they stay one cluster. */}
          <div className="public-phone-composition absolute inset-0">
            <BotanicalDecoration variant="phone" />
            <PhoneMockup />
          </div>
          <p className="public-app-note public-hand-note absolute max-w-[9rem] rotate-[-4deg] text-center text-xl font-bold leading-tight text-teal-900">
            {t('publicHome.app.note')}
            <span aria-hidden="true" className="block text-3xl text-[var(--color-primary)]">♡</span>
          </p>
        </Reveal>
      </div>
      <div aria-hidden="true" className="section-wave section-wave--cream absolute inset-x-0 bottom-0" />
    </section>
  )
}

/**
 * Temporary CSS phone shell. It preserves a realistic app preview without
 * introducing an unrelated screenshot while the real MedAccess app mockup is pending.
 */
function PhoneMockup() {
  const { t } = useTranslation()

  return (
    <div className="public-phone absolute z-10 flex h-[28rem] w-[17rem] rotate-[-3deg] flex-col rounded-[2.8rem] border-[0.65rem] border-slate-950 bg-white p-3 shadow-[0_28px_55px_rgb(15_23_42/0.22)] lg:h-[29rem] lg:w-[18rem]">
      <span className="absolute left-1/2 top-1 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-950" />
      <div className="flex-1 overflow-hidden rounded-[2rem] bg-[#f4fffc] px-4 pb-5 pt-9">
        <p className="text-xs text-[var(--color-text-secondary)]">{t('publicHome.app.phoneHello')}</p>
        <p className="mt-1 text-lg font-black">{t('publicHome.app.phonePrompt')}</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {services.map(({ key, icon: Icon }) => (
            <span
              className="grid min-h-20 place-items-center rounded-xl bg-white text-center text-[0.55rem] font-bold shadow-sm"
              key={key}
            >
              <Icon className="size-5 text-[var(--color-primary)]" />
              {t(`publicHome.services.items.${key}.short`)}
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[0.65rem] font-bold text-[var(--color-primary)]">
            {t('publicHome.app.phoneUpcoming')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-teal-100 text-xs font-black text-teal-800">MA</span>
            <span>
              <strong className="block text-xs">{t('publicHome.app.phoneDoctor')}</strong>
              <span className="block text-[0.65rem] text-slate-500">{t('publicHome.app.phoneTime')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
