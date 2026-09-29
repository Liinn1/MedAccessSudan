import type { ComponentType, ReactNode, SVGProps } from 'react'

type DashboardIcon = ComponentType<SVGProps<SVGSVGElement>>

interface DashboardEmptyStateProps {
  icon?: DashboardIcon
  title: string
  description: string
  action?: ReactNode
}

export function DashboardEmptyState({ icon: Icon, title, description, action }: DashboardEmptyStateProps) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-5 text-center">
      {Icon && <Icon className="mx-auto size-7 text-[var(--color-primary)]" />}
      <p className={`font-extrabold ${Icon ? 'mt-2' : ''}`}>{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
