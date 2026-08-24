import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '../../components/LanguageToggle'
import { ServiceCard } from '../../components/patient/ServiceCard'
import { BellIcon, CalendarIcon, HomeIcon, LaboratoryIcon, ProfileIcon, StethoscopeIcon, VisitIcon } from '../../components/icons/PatientHomeIcons'

const services = [
  { key: 'findDoctor', accent: 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]', icon: StethoscopeIcon },
  { key: 'homeVisit', accent: 'bg-amber-100 text-amber-600', icon: VisitIcon },
  { key: 'laboratory', accent: 'bg-sky-100 text-sky-600', icon: LaboratoryIcon },
  { key: 'appointments', accent: 'bg-purple-100 text-purple-600', icon: CalendarIcon },
] as const

export function PatientHomePage() {
  const { t } = useTranslation()
  const [notice, setNotice] = useState('')

  const announcePendingPage = (label: string) => {
    setNotice(t('patient.home.pendingPage', { page: label }))
  }

  return (
    <main className="min-h-dvh bg-[var(--color-background)] pb-24 lg:pb-8">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
        <div className="mb-6 flex justify-end"><LanguageToggle /></div>

        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-base font-bold text-white sm:size-16">AM</div>
            <div className="min-w-0">
              <p className="text-base text-[var(--color-muted)] sm:text-lg">{t('patient.home.welcomeBack')}</p>
              <h1 className="truncate text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{t('patient.home.greeting', { name: t('patient.home.demoName') })}</h1>
            </div>
          </div>
          <button aria-label={t('patient.home.notifications')} className="grid size-12 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] shadow-sm hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={() => announcePendingPage(t('patient.home.notifications'))} type="button">
            <BellIcon className="size-6" />
          </button>
        </header>

        <section className="mt-8 rounded-3xl bg-[var(--color-primary)] px-6 py-8 text-white sm:px-10 sm:py-10">
          <h2 className="max-w-3xl text-2xl font-extrabold sm:text-3xl lg:text-4xl">{t('patient.home.heroTitle')}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-teal-50 sm:text-lg">{t('patient.home.heroDescription')}</p>
        </section>

        <section className="mt-10" aria-labelledby="medical-services-title">
          <h2 id="medical-services-title" className="text-2xl font-extrabold text-[var(--color-text-primary)] sm:text-3xl">{t('patient.home.servicesTitle')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 min-[430px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {services.map(({ key, accent, icon: Icon }) => {
              const label = t(`patient.home.services.${key}`)
              return <ServiceCard key={key} accentClassName={accent} actionLabel={t('patient.home.bookNow')} icon={<Icon className="size-8" />} label={label} onSelect={() => announcePendingPage(label)} />
            })}
          </div>
        </section>

        <p aria-live="polite" className="mt-6 min-h-6 text-center text-sm font-medium text-[var(--color-primary)]">{notice}</p>
      </div>

      <nav aria-label={t('patient.navigation.label')} className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--color-border)] bg-white lg:static lg:mx-auto lg:mt-4 lg:max-w-7xl lg:rounded-2xl lg:border">
        <div className="mx-auto grid max-w-xl grid-cols-3 lg:max-w-3xl">
          <button aria-current="page" className="flex min-h-20 flex-col items-center justify-center gap-1 text-[var(--color-primary)]" type="button"><HomeIcon className="size-6" /><span className="text-sm font-semibold">{t('patient.navigation.home')}</span></button>
          <button className="flex min-h-20 flex-col items-center justify-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-primary)]" onClick={() => announcePendingPage(t('patient.navigation.appointments'))} type="button"><CalendarIcon className="size-6" /><span className="text-sm">{t('patient.navigation.appointments')}</span></button>
          <button className="flex min-h-20 flex-col items-center justify-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-primary)]" onClick={() => announcePendingPage(t('patient.navigation.profile'))} type="button"><ProfileIcon className="size-6" /><span className="text-sm">{t('patient.navigation.profile')}</span></button>
        </div>
      </nav>
    </main>
  )
}
