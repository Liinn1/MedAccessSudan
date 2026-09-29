import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Account-type chooser for public sign-up. Focus is trapped inside the dialog
 * and returned to the opener on close.
 */
export function SignUpChoiceModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Restore the previous overflow value so other pages are not left unscrollable.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="signup-choice-title"
        aria-modal="true"
        className="public-modal-enter w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl sm:p-8"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold" id="signup-choice-title">
              {t('publicHome.signup.title')}
            </h2>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {t('publicHome.signup.description')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            aria-label={t('publicHome.signup.close')}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-xl"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-surface)] p-5 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none"
            onClick={onClose}
            to="/register/patient"
          >
            <span className="block text-lg font-bold text-[var(--color-primary)]">
              {t('publicHome.signup.patientTitle')}
            </span>
            <span className="mt-2 block text-sm text-[var(--color-text-secondary)]">
              {t('publicHome.signup.patientDescription')}
            </span>
          </Link>
          <Link
            className="rounded-2xl border-2 border-[var(--color-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none"
            onClick={onClose}
            to="/register/doctor"
          >
            <span className="block text-lg font-bold text-[var(--color-primary)]">
              {t('publicHome.signup.providerTitle')}
            </span>
            <span className="mt-2 block text-sm text-[var(--color-text-secondary)]">
              {t('publicHome.signup.providerDescription')}
            </span>
          </Link>
          <Link
            className="rounded-2xl border-2 border-[var(--color-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none"
            onClick={onClose}
            to="/register/laboratory"
          >
            <span className="block text-lg font-bold text-[var(--color-primary)]">
              {t('publicHome.signup.laboratoryTitle')}
            </span>
            <span className="mt-2 block text-sm text-[var(--color-text-secondary)]">
              {t('publicHome.signup.laboratoryDescription')}
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
