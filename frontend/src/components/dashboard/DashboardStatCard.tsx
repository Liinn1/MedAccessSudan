import type { ComponentType, ReactNode, SVGProps } from 'react'

type DashboardIcon = ComponentType<SVGProps<SVGSVGElement>>

export type DashboardStatTone = 'pending' | 'info' | 'ready' | 'accent'

const tones: Record<DashboardStatTone, string> = {
  pending: 'border-amber-100 bg-amber-50/70 text-amber-800',
  info: 'border-sky-100 bg-sky-50/80 text-sky-800',
  ready: 'border-emerald-100 bg-[var(--color-success-surface)] text-emerald-800',
  accent: 'border-teal-100 bg-[var(--color-primary-surface)] text-[var(--color-primary)]',
}

interface DashboardStatCardProps {
  icon: DashboardIcon
  label: string
  value: number | string
  hint: string
  tone?: DashboardStatTone
}

export function DashboardStatsGrid({ children, label }: { children: ReactNode; label: string }) {
  return <section aria-label={label} className="dashboard-stats">{children}</section>
}

export function DashboardStatCard({ icon: Icon, label, value, hint, tone = 'accent' }: DashboardStatCardProps) {
  return (
    <article className="dashboard-stat">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span>
      </div>
      <p className="direction-ltr mt-2 text-start text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{hint}</p>
    </article>
  )
}
