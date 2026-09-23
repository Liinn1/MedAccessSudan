import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { SupportIcon } from '../icons/PatientHomeIcons'
import { LanguageToggle } from '../LanguageToggle'
import { BrandMark } from '../branding/BrandMark'
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
  const initials = user ? `${user.first_name?.[0] ?? user.name[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : ''

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

  const navigation = (
    <nav aria-label={navigationLabel} className="grid gap-2">
      {items.map(({ key, active, icon: Icon, label, onSelect }) => (
        <button aria-current={active ? 'page' : undefined} className={`group flex min-h-12 items-center gap-3 rounded-xl px-4 text-start text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${active ? 'bg-[var(--color-primary)] text-white shadow-md shadow-teal-800/15' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]'}`} key={key} onClick={() => { setMenuOpen(false); onSelect() }} type="button">
          <Icon className="size-5 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  )

  const support = (
    <section className="rounded-2xl bg-[var(--color-primary-surface)] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm"><SupportIcon className="size-5" /></span>
        <h2 className="font-extrabold text-[var(--color-text-primary)]">{helpTitle}</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{helpDescription}</p>
      <button className="mt-3 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-bold text-[var(--color-primary)] shadow-sm hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => setSupportOpen(true)} type="button">{contactSupportLabel}</button>
    </section>
  )

  return <>
    <aside className="fixed inset-y-0 start-0 z-40 hidden h-dvh min-h-dvh w-64 flex-col border-e border-[var(--color-border)] bg-white px-4 py-5 lg:flex">
      <Link aria-label={t('publicHome.header.logoLabel')} className="mx-auto rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/"><BrandMark compact /></Link>
      <div className="mt-8">{navigation}</div>
      <div className="min-h-8 flex-1" aria-hidden="true" />
      <div>{support}</div>
    </aside>

    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur lg:ms-64">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button aria-expanded={menuOpen} aria-label={menuLabel} className="grid size-10 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] lg:hidden" onClick={() => setMenuOpen(true)} type="button">☰</button>
        <div className="ms-auto flex min-w-0 items-center gap-3">
          <LanguageToggle />
          {user && <div className="hidden min-w-0 items-center gap-2 border-s border-[var(--color-border)] ps-3 sm:flex">
            {user.profile_image_url ? <img alt="" className="size-10 rounded-full object-cover" src={user.profile_image_url} /> : <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-black text-white">{initials}</span>}
            <span className="min-w-0"><strong className="block max-w-36 truncate text-sm">{user.name}</strong><span className="block truncate text-xs text-[var(--color-text-secondary)]">{roleLabel}</span></span>
          </div>}
          <button className="min-h-10 shrink-0 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60" disabled={isLoggingOut} onClick={onLogout} type="button">{isLoggingOut ? loggingOutLabel : logoutLabel}</button>
        </div>
      </div>
    </header>

    {menuOpen && <div className="dashboard-drawer-overlay fixed inset-0 z-50 bg-slate-950/45 lg:hidden" onMouseDown={() => setMenuOpen(false)}>
      <aside aria-label={mobileLabel} className="dashboard-drawer-enter absolute inset-block-0 start-0 flex w-[min(84vw,20rem)] flex-col overflow-y-auto bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><BrandMark compact /><button aria-label={closeLabel} className="grid size-10 place-items-center rounded-xl border" onClick={() => setMenuOpen(false)} type="button">×</button></div>
        <div className="mt-7">{navigation}</div>
        <div className="min-h-8 flex-1" aria-hidden="true" />
        <div>{support}</div>
      </aside>
    </div>}

    <InformationDialog closeLabel={closeLabel} description={supportComingSoon} onClose={() => setSupportOpen(false)} open={supportOpen} title={contactSupportLabel} />
  </>
}
