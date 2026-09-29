import type { ReactNode } from 'react'

interface DashboardSectionCardProps {
  title: string
  action?: ReactNode
  description?: string
  children: ReactNode
}

export function DashboardSectionCard({ title, action, description, children }: DashboardSectionCardProps) {
  return (
    <section className="dashboard-home-card dashboard-home-card--compact">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function DashboardSplit({ children }: { children: ReactNode }) {
  return <div className="dashboard-split">{children}</div>
}
