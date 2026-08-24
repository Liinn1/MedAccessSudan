import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandMark } from '../branding/BrandMark'
import { LanguageToggle } from '../LanguageToggle'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout, type AuthenticatedUser } from '../../services/authService'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath } from '../../utils/navigation'

interface PublicHeaderProps { onSignUp: () => void }

export function PublicHeader({ onSignUp }: PublicHeaderProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const links = [
    ['/', 'home'], ['/#featured-doctors', 'findDoctor'], ['/#services', 'services'], ['/#about', 'about'],
  ] as const

  useEffect(() => {
    const controller = new AbortController()
    getCurrentUser(controller.signal)
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 401) setUser(null)
      })
      .finally(() => setIsCheckingAuth(false))
    return () => controller.abort()
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      setUser(null)
      setOpen(false)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const bookingPath = user?.role === 'patient' ? APPOINTMENT_SEARCH_ROUTE : buildLoginPath(APPOINTMENT_SEARCH_ROUTE)

  const accountActions = isCheckingAuth ? (
    <span aria-label={t('publicHome.header.checkingAccount')} className="h-9 w-24 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" role="status" />
  ) : user ? (
    <>
      {user.role === 'patient' && <Link className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/patient/home">{t('publicHome.header.account')}</Link>}
      <button className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] disabled:opacity-60" disabled={isLoggingOut} onClick={handleLogout} type="button">{t(isLoggingOut ? 'publicHome.header.loggingOut' : 'publicHome.header.logout')}</button>
    </>
  ) : (
    <>
      <Link className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/login">{t('publicHome.header.login')}</Link>
      <button className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={onSignUp} type="button">{t('publicHome.header.signUp')}</button>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-5 px-5 sm:px-8 lg:px-10">
        <Link aria-label={t('publicHome.header.logoLabel')} className="shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/"><BrandMark compact /></Link>
        <nav aria-label={t('publicHome.header.navigation')} className="hidden items-center gap-1 lg:flex">
          {links.map(([to, key]) => <Link className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to={to} key={key}>{t(`publicHome.header.${key}`)}</Link>)}
        </nav>
        <div className="ms-auto hidden items-center gap-2 lg:flex">
          <LanguageToggle />
          {accountActions}
          <Link className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" to={bookingPath}>{t('publicHome.header.book')}</Link>
        </div>
        <button aria-expanded={open} className="ms-auto rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] lg:hidden" onClick={() => setOpen((value) => !value)} type="button">{t('publicHome.header.menu')}</button>
      </div>
      {open && <div className="border-t border-[var(--color-border)] bg-white p-4 lg:hidden"><nav className="mx-auto grid max-w-7xl gap-1" aria-label={t('publicHome.header.mobileNavigation')}>{links.map(([to, key]) => <Link className="rounded-xl px-4 py-3 font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]" to={to} key={key} onClick={() => setOpen(false)}>{t(`publicHome.header.${key}`)}</Link>)}<div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3"><LanguageToggle />{accountActions}<Link className="rounded-full bg-[var(--color-primary)] px-4 py-2 font-bold text-white" onClick={() => setOpen(false)} to={bookingPath}>{t('publicHome.header.book')}</Link></div></nav></div>}
    </header>
  )
}
