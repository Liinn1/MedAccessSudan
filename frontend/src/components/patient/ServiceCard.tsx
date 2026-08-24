import type { ReactNode } from 'react'

interface ServiceCardProps {
  accentClassName: string
  icon: ReactNode
  label: string
  actionLabel: string
  onSelect: () => void
  entranceDelay?: number
}

export function ServiceCard({ accentClassName, icon, label, actionLabel, onSelect, entranceDelay = 0 }: ServiceCardProps) {
  return (
    <button
      className="service-card-enter group min-h-44 min-w-0 rounded-3xl border border-[var(--color-border)] bg-white p-4 text-start shadow-sm transition duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_16px_35px_rgb(15_118_110/0.10)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none sm:min-h-52 sm:p-6"
      onClick={onSelect}
      style={{ animationDelay: `${entranceDelay}ms` }}
      type="button"
    >
      <span className={`grid size-16 place-items-center rounded-2xl ${accentClassName}`}>
        {icon}
      </span>
      <span className="mt-5 block break-words text-lg font-bold leading-tight text-[var(--color-text-primary)] sm:mt-6 sm:text-2xl">{label}</span>
      <span className="mt-2 block text-sm font-semibold text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-base">{actionLabel}</span>
    </button>
  )
}
