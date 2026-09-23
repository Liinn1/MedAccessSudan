import type { ReactNode } from 'react'

interface ServiceCardProps {
  accentClassName: string
  icon: ReactNode
  label: string
  actionLabel: string
  futureLabel?: string
  onSelect: () => void
  entranceDelay?: number
}

export function ServiceCard({ accentClassName, icon, label, actionLabel, futureLabel, onSelect, entranceDelay = 0 }: ServiceCardProps) {
  return (
    <button
      className="service-card-enter group flex min-h-24 min-w-0 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 text-start transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_10px_24px_rgb(15_118_110/0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none"
      onClick={onSelect}
      style={{ animationDelay: `${entranceDelay}ms` }}
      type="button"
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${accentClassName}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <strong className="block truncate text-sm font-extrabold text-[var(--color-text-primary)]">{label}</strong>
          {futureLabel && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-bold text-[var(--color-text-secondary)]">{futureLabel}</span>}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-primary)]">{actionLabel}</span>
      </span>
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] text-lg text-[var(--color-text-secondary)] transition group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)] rtl:rotate-180">›</span>
    </button>
  )
}
