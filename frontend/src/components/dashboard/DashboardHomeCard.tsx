import type { ReactNode } from 'react'

export function DashboardHomeGrid({ children }: { children: ReactNode }) {
  return <div className="dashboard-home-grid">{children}</div>
}

interface DashboardHomeCardProps {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  compact?: boolean
}

export function DashboardHomeCard({ title, icon, action, children, compact = false }: DashboardHomeCardProps) {
  return (
    <section className={`dashboard-home-card ${compact ? 'dashboard-home-card--compact' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="text-lg font-extrabold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}
