import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandMark } from '../branding/BrandMark'
import { LanguageToggle } from '../LanguageToggle'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout, type AuthenticatedUser } from '../../services/authService'
import { APPOINTMENT_SEARCH_ROUTE, buildLoginPath, DOCTOR_DASHBOARD_ROUTE } from '../../utils/navigation'

interface PublicHeaderProps {
  onSignUp: () => void
}

const publicLinks = [
  ['/#home', 'home'],
  ['/#about', 'about'],
  ['/#services', 'services'],
  ['/#featured-doctors', 'findDoctor'],
  ['/#contact', 'contact'],
] as const

const mobileNavigationId = 'public-mobile-navigation'

/**
 * Shared public navigation. A lightweight auth check changes account actions
 * without exposing user details in the public header.
 */
export function PublicHeader({ onSignUp }: PublicHeaderProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true

    getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (mounted) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (mounted && error instanceof ApiError && error.status === 401) setUser(null)
      })
      .finally(() => {
        if (mounted) setIsCheckingAuth(false)
      })

    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!open) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

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
      {user.role === 'patient' && (
        <Link
          className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          to="/patient/home"
        >
          {t('publicHome.header.account')}
        </Link>
      )}
      {user.role === 'doctor' && (
        <Link
          className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          to={DOCTOR_DASHBOARD_ROUTE}
        >
          {t('publicHome.header.account')}
        </Link>
      )}
      <button
        className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
      >
        {t(isLoggingOut ? 'publicHome.header.loggingOut' : 'publicHome.header.logout')}
      </button>
    </>
  ) : (
    <>
      <Link
        className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
        to="/login"
      >
        {t('publicHome.header.login')}
      </Link>
      <button
        className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
        onClick={onSignUp}
        type="button"
      >
        {t('publicHome.header.signUp')}
      </button>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-teal-50 bg-white/92 shadow-[0_4px_20px_rgb(15_118_110/0.04)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.75rem] max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          aria-label={t('publicHome.header.logoLabel')}
          className="shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          to="/"
        >
          <BrandMark />
        </Link>
        <nav aria-label={t('publicHome.header.navigation')} className="hidden items-center gap-0.5 xl:flex">
          {publicLinks.map(([to, key]) => (
            <Link
              className="rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              key={key}
              to={to}
            >
              {t(`publicHome.header.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="ms-auto hidden items-center gap-2 xl:flex">
          <LanguageToggle />
          {accountActions}
        </div>
        <button
          aria-controls={mobileNavigationId}
          aria-expanded={open}
          className="ms-auto rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] xl:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {t('publicHome.header.menu')}
        </button>
      </div>
      {open && (
        <div className="border-t border-[var(--color-border)] bg-white p-4 xl:hidden" id={mobileNavigationId}>
          <nav
            aria-label={t('publicHome.header.mobileNavigation')}
            className="mx-auto grid max-w-7xl gap-1"
          >
            {publicLinks.map(([to, key]) => (
              <Link
                className="rounded-xl px-4 py-3 font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                key={key}
                onClick={() => setOpen(false)}
                to={to}
              >
                {t(`publicHome.header.${key}`)}
              </Link>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
              <LanguageToggle />
              {accountActions}
              <Link
                className="rounded-full border border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                onClick={() => setOpen(false)}
                to={bookingPath}
              >
                {t('publicHome.header.book')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
