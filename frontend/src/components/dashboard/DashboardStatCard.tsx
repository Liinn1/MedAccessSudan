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

export function DashboardStatsGrid({ columns = 4, children, label }: { columns?: 3 | 4; children: ReactNode; label: string }) {
  return <section aria-label={label} className={`dashboard-stats ${columns === 3 ? 'dashboard-stats--3' : 'dashboard-stats--4'}`}>{children}</section>
}

export function DashboardStatCard({ icon: Icon, label, value, hint, tone = 'accent' }: DashboardStatCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-[var(--color-text-secondary)] sm:text-sm">{label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl border sm:size-9 ${tones[tone]}`}><Icon className="size-4" /></span>
      </div>
      <p className="direction-ltr mt-2 text-start text-2xl font-black tabular-nums text-[var(--color-text-primary)] sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{hint}</p>
    </article>
  )
}
