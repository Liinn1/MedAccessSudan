import { useEffect, useId, useRef } from 'react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  loadingLabel: string
  busy?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({ open, title, description, cancelLabel, confirmLabel, loadingLabel, busy = false, error, onCancel, onConfirm }: ConfirmationDialogProps) {
  const titleId = useId(); const descriptionId = useId(); const errorId = useId()
  const dialogRef = useRef<HTMLDivElement>(null); const confirmRef = useRef<HTMLButtonElement>(null); const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => { returnFocusRef.current?.focus() }
  }, [open])

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onCancel(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      if (!controls.length) return
      const first = controls[0]; const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  if (!open) return null
  return <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <div aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`} aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" ref={dialogRef} role="dialog">
      <div aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-surface)] text-2xl font-black text-[var(--color-primary)]">✓</div>
      <h2 className="mt-5 text-2xl font-extrabold text-[var(--color-text-primary)]" id={titleId}>{title}</h2>
      <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]" id={descriptionId}>{description}</p>
      {error && <p className="feedback-enter mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 motion-reduce:animate-none" id={errorId} role="alert">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="min-h-12 rounded-full border border-[var(--color-border)] bg-white px-6 font-bold text-[var(--color-text-primary)] transition hover:border-teal-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={onCancel} type="button">{cancelLabel}</button>
        <button className="min-h-12 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-wait disabled:opacity-70" disabled={busy} onClick={onConfirm} ref={confirmRef} type="button">{busy ? loadingLabel : confirmLabel}</button>
      </div>
    </div>
  </div>
}
