import type { ReactNode } from 'react'

interface ServiceCardProps {
  accentClassName: string
  icon: ReactNode
  label: string
  actionLabel: string
  onSelect: () => void
}

export function ServiceCard({ accentClassName, icon, label, actionLabel, onSelect }: ServiceCardProps) {
  return (
    <button
      className="group min-h-48 rounded-3xl border border-[var(--color-border)] bg-white p-6 text-start shadow-[5px_5px_0_0_#e5e7eb] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)] sm:min-h-52"
      onClick={onSelect}
      type="button"
    >
      <span className={`grid size-16 place-items-center rounded-2xl ${accentClassName}`}>
        {icon}
      </span>
      <span className="mt-6 block text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">{label}</span>
      <span className="mt-1 block text-base text-[var(--color-muted)] group-hover:text-[var(--color-primary)]">{actionLabel}</span>
    </button>
  )
}
