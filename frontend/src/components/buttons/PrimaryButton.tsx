import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/** Primary MedAccess action button with keyboard and disabled states. */
export function PrimaryButton({ children, className = '', ...buttonProps }: PrimaryButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`min-h-13 w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-base font-bold text-white transition-colors hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 [@media(min-height:760px)]:min-h-14 [@media(min-height:760px)]:text-lg ${className}`}
    >
      {children}
    </button>
  )
}
