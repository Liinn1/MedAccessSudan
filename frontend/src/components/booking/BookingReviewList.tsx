interface BookingReviewRow {
  label: string
  value: string
  ltr?: boolean
}

export function BookingReviewList({ rows }: { rows: BookingReviewRow[] }) {
  return (
    <dl className="mt-5 divide-y divide-slate-100">
      {rows.map((row) => (
        <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:items-start" key={row.label}>
          <dt className="font-bold text-[var(--color-text-secondary)]">{row.label}</dt>
          <dd className={`font-semibold ${row.ltr ? 'direction-ltr text-start' : ''}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
