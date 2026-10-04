import type { CollectionSlot } from '../../utils/collectionSlots'

export function BookingSlotPicker({
  emptyLabel,
  locale,
  onSelect,
  selectedStartsAt,
  slots,
  title,
}: {
  emptyLabel: string
  locale: string
  onSelect: (slot: CollectionSlot) => void
  selectedStartsAt?: string | null
  slots: CollectionSlot[]
  title: string
}) {
  return (
    <section>
      <h3 className="font-extrabold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {slots.map((item) => (
          <button
            aria-pressed={selectedStartsAt === item.starts_at}
            className={`rounded-xl border px-3 py-2 text-sm font-bold ${selectedStartsAt === item.starts_at ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white'}`}
            key={item.starts_at}
            onClick={() => onSelect(item)}
            type="button"
          >
            {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: item.timeZone }).format(new Date(item.starts_at))}
          </button>
        ))}
      </div>
      {slots.length === 0 && <p className="mt-3 text-sm text-red-700">{emptyLabel}</p>}
    </section>
  )
}
