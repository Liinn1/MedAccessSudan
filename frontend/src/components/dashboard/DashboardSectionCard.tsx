import type { ReactNode } from 'react'

interface DashboardSectionCardProps {
  title: string
  action?: ReactNode
  description?: string
  children: ReactNode
  className?: string
}

export function DashboardSectionCard({ title, action, description, children, className = '' }: DashboardSectionCardProps) {
  return (
    <section className={`rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DashboardSplit({ primary = false, children }: { primary?: boolean; children: ReactNode }) {
  return <div className={`dashboard-split ${primary ? 'dashboard-split--primary' : 'dashboard-split--secondary'}`}>{children}</div>
}
