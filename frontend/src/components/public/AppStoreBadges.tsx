import { useTranslation } from 'react-i18next'

function AppleIcon() {
  return <svg aria-hidden="true" className="size-7" fill="currentColor" viewBox="0 0 24 24"><path d="M16.7 12.8c0-2.5 2.1-3.7 2.2-3.8a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1 1-3.9 1s-2-1-3.4-1a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.5a11 11 0 0 0 1.4-2.9 4.5 4.5 0 0 1-2.9-4.2ZM14 5.3A4.6 4.6 0 0 0 15.1 2a4.7 4.7 0 0 0-3 1.6A4.3 4.3 0 0 0 11 6.8a3.9 3.9 0 0 0 3-1.5Z"/></svg>
}

function PlayIcon() {
  return <svg aria-hidden="true" className="size-7" viewBox="0 0 24 24"><path d="m3.5 2.8 10 9.2-10 9.2a2.2 2.2 0 0 1-.5-1.4V4.2c0-.5.2-1 .5-1.4Z" fill="#34A853"/><path d="m13.5 12 3-2.8 3.7 2.1c1 .6 1 1.5 0 2.1l-3.7 2.1-3-3.5Z" fill="#FBBC04"/><path d="M3.5 2.8c.6-.5 1.3-.5 2.1 0l10.9 6.4-3 2.8-10-9.2Z" fill="#4285F4"/><path d="m13.5 12 3 3.5-10.9 6.4c-.8.4-1.5.3-2.1-.7l10-9.2Z" fill="#EA4335"/></svg>
}

export function AppStoreBadges() {
  const { t } = useTranslation()
  const stores = [{ key: 'apple', icon: AppleIcon }, { key: 'google', icon: PlayIcon }] as const
  return <div className="app-store-list mt-6 grid grid-cols-2 gap-3">{stores.map(({ key, icon: Icon }) => <div className="store-badge flex min-w-0 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-white shadow-sm sm:gap-3 sm:px-4" key={key}><span className="shrink-0"><Icon/></span><span className="min-w-0"><span className="block text-[0.6rem] font-semibold uppercase tracking-wide text-slate-300 sm:text-[0.65rem]">{t('publicHome.comingSoon')}</span><span className="block text-xs font-bold sm:text-sm">{t(`publicHome.app.stores.${key}`)}</span></span></div>)}</div>
}
