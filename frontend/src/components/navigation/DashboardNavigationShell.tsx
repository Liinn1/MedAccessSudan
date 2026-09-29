import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { SupportIcon } from '../icons/PatientHomeIcons'
import { LanguageToggle } from '../LanguageToggle'
import { BrandMark } from '../branding/BrandMark'
import { ProfileAvatar } from '../branding/ProfileAvatar'
import { InformationDialog } from '../feedback/InformationDialog'

export interface DashboardNavItem {
  key: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  active: boolean
  onSelect: () => void
}

interface DashboardNavigationShellProps {
  helpDescription: string
  helpTitle: string
  isLoggingOut: boolean
  items: DashboardNavItem[]
  logoutLabel: string
  loggingOutLabel: string
  menuLabel: string
  closeLabel: string
  mobileLabel: string
  navigationLabel: string
  onLogout: () => void
  roleLabel: string
  supportComingSoon: string
  contactSupportLabel: string
  user?: AuthenticatedUser | null
}

export function DashboardNavigationShell({
  closeLabel,
  contactSupportLabel,
  helpDescription,
  helpTitle,
  isLoggingOut,
  items,
  loggingOutLabel,
  logoutLabel,
  menuLabel,
  mobileLabel,
  navigationLabel,
  onLogout,
  roleLabel,
  supportComingSoon,
  user,
}: DashboardNavigationShellProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const primaryItems = items.filter((item) => item.key !== 'public-home')
  const homeItems = items.filter((item) => item.key === 'public-home')

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const navButtons = (entries: DashboardNavItem[]) => (
    <nav aria-label={navigationLabel} className="grid gap-1.5">
      {entries.map(({ key, active, icon: Icon, label, onSelect }) => (
        <button aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-start text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${active ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]'}`} key={key} onClick={() => { setMenuOpen(false); onSelect() }} type="button">
          <Icon className="size-5 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  )

  const support = (
    <section className="rounded-2xl bg-[var(--color-primary-surface)] p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[var(--color-primary)] shadow-sm"><SupportIcon className="size-4" /></span>
        <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">{helpTitle}</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{helpDescription}</p>
      <button className="mt-2.5 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-bold text-[var(--color-primary)] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => setSupportOpen(true)} type="button">{contactSupportLabel}</button>
    </section>
  )

  return <>
    <aside className="fixed inset-y-0 start-0 z-40 hidden h-dvh min-h-dvh w-64 flex-col border-e border-[var(--color-border)] bg-white px-4 py-5 lg:flex">
      <Link aria-label={t('publicHome.header.logoLabel')} className="mx-auto rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/"><BrandMark compact /></Link>
      <div className="mt-7">{navButtons(primaryItems)}</div>
      {homeItems.length > 0 && <div className="mt-3 border-t border-[var(--color-border)] pt-3">{navButtons(homeItems)}</div>}
      <div className="min-h-6 flex-1" aria-hidden="true" />
      <div>{support}</div>
    </aside>

    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur lg:ms-64">
      <div className="flex min-h-14 items-center px-4 sm:px-6 lg:min-h-16 lg:px-8">
        <Link aria-label={t('publicHome.header.logoLabel')} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] lg:hidden" to="/">
          <BrandMark compact />
        </Link>
        <div className="ms-auto hidden items-center gap-3 lg:flex">
          <LanguageToggle />
          {user && <div className="flex min-w-0 items-center gap-2 border-s border-[var(--color-border)] ps-3">
            <ProfileAvatar className="size-10 shrink-0 rounded-full text-xs" imageUrl={user.profile_image_url} name={user.name} />
            <span className="min-w-0"><strong className="block max-w-36 truncate text-sm">{user.name}</strong><span className="block truncate text-xs text-[var(--color-text-secondary)]">{roleLabel}</span></span>
          </div>}
          <button className="min-h-10 shrink-0 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60" disabled={isLoggingOut} onClick={onLogout} type="button">{isLoggingOut ? loggingOutLabel : logoutLabel}</button>
        </div>
        <button aria-controls="dashboard-mobile-drawer" aria-expanded={menuOpen} aria-label={menuLabel} className="ms-auto grid size-10 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] lg:hidden" onClick={() => setMenuOpen(true)} type="button">
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </header>

    {menuOpen && <div className="dashboard-drawer-overlay fixed inset-0 z-50 bg-slate-950/45 lg:hidden" onMouseDown={() => setMenuOpen(false)}>
      <aside aria-label={mobileLabel} className="dashboard-drawer-enter absolute inset-block-0 start-0 flex w-[min(84vw,20rem)] flex-col overflow-y-auto bg-white p-5 shadow-2xl" id="dashboard-mobile-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <BrandMark compact />
          <button aria-label={closeLabel} className="grid size-10 place-items-center rounded-xl border border-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => setMenuOpen(false)} type="button">×</button>
        </div>
        {user && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] p-3">
          <ProfileAvatar className="size-10 shrink-0 rounded-full text-xs" imageUrl={user.profile_image_url} name={user.name} />
          <span className="min-w-0"><strong className="block truncate text-sm">{user.name}</strong><span className="block truncate text-xs text-[var(--color-text-secondary)]">{roleLabel}</span></span>
        </div>}
        <div className="mt-5">{navButtons(primaryItems)}</div>
        {homeItems.length > 0 && <div className="mt-3 border-t border-[var(--color-border)] pt-3">{navButtons(homeItems)}</div>}
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('language.selectorLabel')}</p>
          <LanguageToggle />
        </div>
        <div className="min-h-6 flex-1" aria-hidden="true" />
        <button className="mb-3 min-h-11 w-full rounded-xl border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-text-secondary)] hover:border-red-200 hover:text-red-700 disabled:opacity-60" disabled={isLoggingOut} onClick={() => { setMenuOpen(false); onLogout() }} type="button">{isLoggingOut ? loggingOutLabel : logoutLabel}</button>
        <div>{support}</div>
      </aside>
    </div>}

    <InformationDialog closeLabel={closeLabel} description={supportComingSoon} onClose={() => setSupportOpen(false)} open={supportOpen} title={contactSupportLabel} />
  </>
}
