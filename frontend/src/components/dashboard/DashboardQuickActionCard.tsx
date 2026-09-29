import type { ReactNode } from 'react'

interface DashboardQuickActionCardProps {
  accentClassName: string
  icon: ReactNode
  label: string
  description: string
  onSelect: () => void
}

export function DashboardQuickActionCard({ accentClassName, icon, label, description, onSelect }: DashboardQuickActionCardProps) {
  return (
    <button
      className="group flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-3 text-start shadow-sm transition hover:border-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      onClick={onSelect}
      type="button"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accentClassName}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-extrabold">{label}</strong>
        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]">{description}</span>
      </span>
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)] rtl:rotate-180">›</span>
    </button>
  )
}
