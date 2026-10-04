import type { ReactNode } from 'react'
import { DashboardEmptyState } from '../dashboard/DashboardEmptyState'
import { LoadingState } from '../feedback/LoadingState'

export function AdminFilters({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap gap-3">{children}</div>
}

export function AdminFilter({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: ReactNode }) {
  return <select aria-label={label} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 font-semibold" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>
}

export function AdminSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <input aria-label={label} className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 sm:max-w-xs" onChange={(event) => onChange(event.target.value)} placeholder={label} value={value} />
}

export function AdminRecordList({ loading, emptyTitle, emptyDescription, children }: { loading?: boolean; emptyTitle: string; emptyDescription: string; children: ReactNode }) {
  if (loading) return <div className="mt-6"><LoadingState contained message="" /></div>
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  if (!items.length || (Array.isArray(children) && children.length === 0)) {
    return <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm"><DashboardEmptyState description={emptyDescription} title={emptyTitle} /></div>
  }
  return <div className="mt-6 grid gap-3">{children}</div>
}

export function AdminRecordCard({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <article className="w-full rounded-3xl border border-[var(--color-border)] bg-white p-5 text-start shadow-sm">
      {children}
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  )
}
