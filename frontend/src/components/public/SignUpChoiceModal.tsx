import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface Props { open: boolean; onClose: () => void }

export function SignUpChoiceModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby="signup-choice-title" aria-modal="true" className="public-modal-enter w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl sm:p-8" role="dialog"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold" id="signup-choice-title">{t('publicHome.signup.title')}</h2><p className="mt-2 text-[var(--color-text-secondary)]">{t('publicHome.signup.description')}</p></div><button ref={closeButtonRef} aria-label={t('publicHome.signup.close')} className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-xl" onClick={onClose} type="button">×</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Link className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-surface)] p-5 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none" onClick={onClose} to="/register/patient"><span className="block text-lg font-bold text-[var(--color-primary)]">{t('publicHome.signup.patientTitle')}</span><span className="mt-2 block text-sm text-[var(--color-text-secondary)]">{t('publicHome.signup.patientDescription')}</span></Link><Link className="rounded-2xl border-2 border-[var(--color-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none" onClick={onClose} to="/register/doctor"><span className="block text-lg font-bold text-[var(--color-primary)]">{t('publicHome.signup.providerTitle')}</span><span className="mt-2 block text-sm text-[var(--color-text-secondary)]">{t('publicHome.signup.providerDescription')}</span></Link></div></section></div>
}
