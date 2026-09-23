import { useEffect, useId, useRef } from 'react'

interface InformationDialogProps { open: boolean; title: string; description: string; closeLabel: string; onClose: () => void }

export function InformationDialog({ open, title, description, closeLabel, onClose }: InformationDialogProps) {
  const titleId = useId(); const descriptionId = useId(); const closeRef = useRef<HTMLButtonElement>(null); const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); returnFocusRef.current?.focus() }
  }, [onClose, open])
  if (!open) return null
  return <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" role="dialog"><span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-surface)] text-xl font-black text-[var(--color-primary)]">i</span><h2 className="mt-5 text-2xl font-extrabold" id={titleId}>{title}</h2><p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]" id={descriptionId}>{description}</p><button className="mt-7 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-6 font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:w-auto" onClick={onClose} ref={closeRef} type="button">{closeLabel}</button></section></div>
}
