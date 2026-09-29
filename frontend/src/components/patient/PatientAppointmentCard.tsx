import type { ReactNode } from 'react'

export function PatientAppointmentCard({
  typeBadge,
  status,
  title,
  subtitle,
  location,
  meta,
  payment,
  paymentLabel,
  actions,
}: {
  typeBadge: ReactNode
  status: ReactNode
  title: string
  subtitle?: string
  location?: string
  meta: { label: string; value: string; ltr?: boolean }[]
  payment?: string | null
  paymentLabel: string
  actions: ReactNode
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">{typeBadge}{status}</div>
      <h3 className="mt-3 truncate text-lg font-extrabold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{subtitle}</p>}
      {location && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{location}</p>}
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4">
        {meta.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-bold text-[var(--color-text-secondary)]">{item.label}</dt>
            <dd className={`mt-1 font-semibold ${item.ltr ? 'direction-ltr' : ''}`}>{item.value}</dd>
          </div>
        ))}
        {payment && (
          <div className="col-span-2">
            <dt className="text-xs font-bold text-[var(--color-text-secondary)]">{paymentLabel}</dt>
            <dd className="mt-1 font-semibold">{payment}</dd>
          </div>
        )}
      </dl>
      <div className="mt-auto flex flex-col gap-2 pt-5">{actions}</div>
    </article>
  )
}
