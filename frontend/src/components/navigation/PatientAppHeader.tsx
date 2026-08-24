import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageToggle } from '../LanguageToggle'
import { BrandMark } from '../branding/BrandMark'

interface PatientAppHeaderProps {
  isLoggingOut: boolean
  onAppointments: () => void
  onDashboard: () => void
  onLogout: () => void
  onProfile: () => void
}

export function PatientAppHeader({ isLoggingOut, onAppointments, onDashboard, onLogout, onProfile }: PatientAppHeaderProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navigationItems = [
    { key: 'dashboard', active: true, onSelect: onDashboard },
    { key: 'appointments', active: false, onSelect: onAppointments },
    { key: 'profile', active: false, onSelect: onProfile },
  ] as const

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10">
        <Link aria-label={t('publicHome.header.logoLabel')} className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/"><BrandMark compact /></Link>
        <nav aria-label={t('patient.navigation.label')} className="hidden items-center gap-1 md:flex">
          <Link className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]" to="/">{t('patient.navigation.home')}</Link>
          {navigationItems.map((item) => (
            <button aria-current={item.active ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${item.active ? 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]'}`} key={item.key} onClick={item.onSelect} type="button">{t(`patient.navigation.${item.key}`)}</button>
          ))}
        </nav>

        <button aria-expanded={menuOpen} aria-label={t('patient.navigation.menu')} className="ms-auto min-h-10 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:hidden" onClick={() => setMenuOpen((open) => !open)} type="button">{t('patient.navigation.menu')}</button>

        <div className="ms-auto hidden min-w-0 items-center gap-3 md:flex">
          <LanguageToggle />
          <button className="min-h-10 shrink-0 rounded-full border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4" disabled={isLoggingOut} onClick={onLogout} type="button">{t(isLoggingOut ? 'patient.home.loggingOut' : 'patient.home.logout')}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute inset-x-5 top-[calc(100%+0.5rem)] z-20 rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-lg md:hidden">
          <nav aria-label={t('patient.navigation.mobileLabel')} className="grid">
            <Link className="rounded-xl px-4 py-3 text-start text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]" onClick={() => setMenuOpen(false)} to="/">{t('patient.navigation.home')}</Link>
            {navigationItems.map((item) => (
              <button aria-current={item.active ? 'page' : undefined} className={`rounded-xl px-4 py-3 text-start text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${item.active ? 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]'}`} key={item.key} onClick={() => { setMenuOpen(false); item.onSelect() }} type="button">{t(`patient.navigation.${item.key}`)}</button>
            ))}
          </nav>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
            <LanguageToggle />
            <button className="min-h-10 rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60" disabled={isLoggingOut} onClick={onLogout} type="button">{t(isLoggingOut ? 'patient.home.loggingOut' : 'patient.home.logout')}</button>
          </div>
        </div>
      )}
    </header>
  )
}
