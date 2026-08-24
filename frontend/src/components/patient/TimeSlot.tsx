interface TimeSlotProps {
  day: string
  time: string
  selected: boolean
  selectedLabel: string
  onSelect: () => void
}

export function TimeSlot({ day, time, selected, selectedLabel, onSelect }: TimeSlotProps) {
  return (
    <button
      aria-pressed={selected}
      className={`service-card-enter min-w-0 rounded-2xl border p-4 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)] shadow-[0_10px_24px_rgb(15_118_110/0.10)]' : 'border-[var(--color-border)] bg-white hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-sm'}`}
      onClick={onSelect}
      type="button"
    >
      <span className="block break-words font-bold text-[var(--color-text-primary)]">{day}</span>
      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{time}</span>
      {selected && <span className="mt-3 inline-flex rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white">{selectedLabel}</span>}
    </button>
  )
}
