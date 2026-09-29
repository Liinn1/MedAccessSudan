import type { ReactNode } from 'react'

interface DashboardInfoRow {
  icon?: ReactNode
  label: string
  value: string
}

interface DashboardInfoCardProps {
  title: string
  editLabel: string
  onEdit: () => void
  rows: DashboardInfoRow[]
}

export function DashboardInfoCard({ title, editLabel, onEdit, rows }: DashboardInfoCardProps) {
  return (
    <section className="dashboard-home-card">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <button className="shrink-0 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={onEdit} type="button">{editLabel}</button>
      </div>
      <dl className="mt-5 grid gap-4">
        {rows.map((row) => (
          <div className="flex items-start gap-3" key={row.label}>
            {row.icon && <span className="mt-0.5 text-[var(--color-text-secondary)]">{row.icon}</span>}
            <div className="min-w-0">
              <dt className="text-xs font-bold text-[var(--color-text-secondary)]">{row.label}</dt>
              <dd className="mt-1 break-all font-semibold" dir="auto">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}
