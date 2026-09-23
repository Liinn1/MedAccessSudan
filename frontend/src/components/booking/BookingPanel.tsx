import type { FormEvent, ReactNode } from 'react'

interface BookingPanelProps {
  children: ReactNode
  className?: string
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

export function BookingPanel({ children, className = '', onSubmit }: BookingPanelProps) {
  const sharedClassName = `mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8 ${className}`
  if (onSubmit) {
    return <form className={sharedClassName} onSubmit={onSubmit}>{children}</form>
  }
  return <section className={sharedClassName}>{children}</section>
}
