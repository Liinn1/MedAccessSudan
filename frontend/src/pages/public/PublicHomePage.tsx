import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarIcon, LaboratoryIcon, LocationIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'
import { AppStoreBadges } from '../../components/public/AppStoreBadges'
import { PublicHeroCarousel } from '../../components/public/PublicHeroCarousel'
import { Reveal } from '../../components/public/Reveal'
import { PublicLayout } from '../../layouts/PublicLayout'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'
import { useSignUpModal } from '../../contexts/signUpModal'

const services = [
  { key: 'doctor', icon: StethoscopeIcon, accent: 'bg-teal-50 text-teal-600' },
  { key: 'visit', icon: VisitIcon, accent: 'bg-amber-50 text-amber-600' },
  { key: 'laboratory', icon: LaboratoryIcon, accent: 'bg-sky-50 text-sky-600' },
  { key: 'appointments', icon: CalendarIcon, accent: 'bg-purple-50 text-purple-600' },
] as const
const doctors = [
  { key: 'ahmed', specialty: 'generalMedicine' },
  { key: 'fatima', specialty: 'pediatrics' },
  { key: 'omar', specialty: 'cardiology' },
] as const
const specialties = ['all', 'cardiology', 'dermatology', 'pediatrics', 'generalMedicine'] as const

export function PublicHomePage() {
  const { t } = useTranslation()
  const openSignUpModal = useSignUpModal()
  const [specialty, setSpecialty] = useState<(typeof specialties)[number]>('all')
  const [notice, setNotice] = useState('')
  const visibleDoctors = specialty === 'all' ? doctors : doctors.filter((doctor) => doctor.specialty === specialty)

  return (
    <PublicLayout>
      <div className="bg-white">
      <PublicHeroCarousel />

      <section className="public-services-section mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10" id="services">
        <Reveal><div className="text-center"><p className="font-bold text-[var(--color-primary)]">{t('publicHome.services.eyebrow')}</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{t('publicHome.services.title')}</h2><p className="mx-auto mt-3 max-w-2xl text-[var(--color-text-secondary)]">{t('publicHome.services.description')}</p></div></Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ key, icon: Icon, accent }, index) => <Reveal delay={index * 90} key={key}><article className="public-card h-full rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><span className={`grid size-14 place-items-center rounded-2xl ${accent}`}><Icon className="size-7" /></span><h3 className="mt-5 text-xl font-bold">{t(`publicHome.services.items.${key}.title`)}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`publicHome.services.items.${key}.description`)}</p></article></Reveal>)}
        </div>
      </section>

      <section className="bg-[var(--color-background)] py-16" id="featured-doctors">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal><h2 className="text-3xl font-black sm:text-4xl">{t('publicHome.doctors.title')}</h2><p className="mt-3 text-[var(--color-text-secondary)]">{t('publicHome.doctors.description')}</p></Reveal>
          <div className="mt-7 flex flex-wrap gap-2">{specialties.map((item) => <button aria-pressed={specialty === item} className={`public-filter rounded-full border px-4 py-2 text-sm font-bold ${specialty === item ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]'}`} key={item} onClick={() => setSpecialty(item)} type="button">{t(`publicHome.doctors.filters.${item}`)}</button>)}</div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {visibleDoctors.map(({ key }, index) => <Reveal delay={index * 90} key={key}><article className="public-card rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><div className="flex items-center gap-4"><div aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-lg font-black text-white">{t(`publicHome.doctors.items.${key}.initials`)}</div><div><h3 className="text-xl font-bold">{t(`publicHome.doctors.items.${key}.name`)}</h3><p className="text-sm text-[var(--color-primary)]">{t(`publicHome.doctors.items.${key}.specialty`)}</p></div></div><p className="mt-5 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><LocationIcon className="size-5 text-[var(--color-primary)]" />{t(`publicHome.doctors.items.${key}.location`)}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[var(--color-success-surface)] px-3 py-1 text-xs font-bold text-emerald-700">{t('publicHome.doctors.verified')}</span><span className="rounded-full bg-[var(--color-primary-surface)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">{t('publicHome.doctors.available')}</span></div><div className="mt-6 flex gap-2"><button className="public-cta flex-1 rounded-full border border-[var(--color-primary)] px-3 py-2 text-sm font-bold text-[var(--color-primary)]" onClick={() => setNotice(t('publicHome.doctors.profilePending'))} type="button">{t('publicHome.doctors.view')}</button><Link className="public-cta flex-1 rounded-full bg-[var(--color-primary)] px-3 py-2 text-center text-sm font-bold text-white" to={buildLoginPath(APPOINTMENT_SEARCH_ROUTE)}>{t('publicHome.doctors.book')}</Link></div></article></Reveal>)}
            {visibleDoctors.length === 0 && <p className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-[var(--color-text-secondary)] md:col-span-3">{t('publicHome.doctors.empty')}</p>}
          </div>
          <p aria-live="polite" className="mt-5 min-h-6 text-center text-sm text-[var(--color-primary)]">{notice}</p>
        </div>
      </section>

      <section className="public-why-section py-16" id="about"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><Reveal><div className="text-center"><h2 className="text-3xl font-black sm:text-4xl">{t('publicHome.why.title')}</h2></div></Reveal><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(['one', 'two', 'three', 'four', 'five', 'six'] as const).map((key, index) => <Reveal delay={(index % 3) * 90} key={key}><article className="public-card why-card h-full rounded-2xl border border-teal-100 bg-white p-6 shadow-sm"><span aria-hidden="true" className="mb-4 block size-2.5 rounded-full bg-[var(--color-primary)]" /><h3 className="font-bold text-[var(--color-primary)]">{t(`publicHome.why.items.${key}.title`)}</h3><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t(`publicHome.why.items.${key}.description`)}</p></article></Reveal>)}</div></div></section>

      <section className="bg-slate-950 py-16 text-white"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><Reveal><h2 className="text-center text-3xl font-black sm:text-4xl">{t('publicHome.how.title')}</h2></Reveal><div className="mt-10 grid gap-4 md:grid-cols-4">{(['find', 'time', 'confirm', 'care'] as const).map((key, index) => <Reveal delay={index * 100} key={key}><article className="public-dark-card relative rounded-2xl border border-white/15 bg-white/5 p-5"><span className="text-3xl font-black text-teal-300">0{index + 1}</span><h3 className="mt-3 font-bold">{t(`publicHome.how.steps.${key}.title`)}</h3><p className="mt-2 text-sm text-slate-300">{t(`publicHome.how.steps.${key}.description`)}</p></article></Reveal>)}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal><div className="public-provider-card rounded-3xl bg-[var(--color-primary)] p-8 text-white"><h2 className="text-3xl font-black">{t('publicHome.providers.title')}</h2><p className="mt-4 leading-relaxed text-teal-50">{t('publicHome.providers.description')}</p><button className="public-cta mt-6 rounded-full bg-white px-6 py-3 font-bold text-[var(--color-primary)]" onClick={openSignUpModal} type="button">{t('publicHome.providers.cta')}</button></div></Reveal><Reveal delay={100}><div className="public-app-card flex h-full items-center gap-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-sm sm:p-8"><div aria-hidden="true" className="hidden h-60 w-32 shrink-0 rounded-[2rem] border-8 border-slate-900 bg-[var(--color-primary-surface)] sm:block" /><div><h2 className="text-3xl font-black">{t('publicHome.app.title')}</h2><p className="mt-3 text-[var(--color-text-secondary)]">{t('publicHome.app.description')}</p><AppStoreBadges /></div></div></Reveal></section>
      </div>
    </PublicLayout>
  )
}
