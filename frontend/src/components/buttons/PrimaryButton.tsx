import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/** Primary MedAccess action button with keyboard and disabled states. */
export function PrimaryButton({ children, className = '', ...buttonProps }: PrimaryButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-base font-bold text-white shadow-[0_10px_24px_rgb(13_148_136/0.2)] transition hover:-translate-y-0.5 hover:bg-[#0F766E] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
    >
      {children}
    </button>
  )
}
