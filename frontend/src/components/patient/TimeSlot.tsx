interface TimeSlotProps {
  time: string
  selected: boolean
  selectedLabel: string
  onSelect: () => void
  unavailable?: boolean
  unavailableLabel?: string
}

export function TimeSlot({ time, selected, selectedLabel, onSelect, unavailable = false, unavailableLabel }: TimeSlotProps) {
  return (
    <button
      aria-pressed={selected}
      className={`service-card-enter min-h-11 w-full min-w-0 rounded-lg border px-2 py-1.5 text-center text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none motion-reduce:transition-none ${unavailable ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 line-through' : selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:-translate-y-0.5 hover:border-teal-300 hover:bg-[var(--color-primary-surface)]'}`}
      disabled={unavailable}
      onClick={onSelect}
      type="button"
    >
      <span className="direction-ltr block whitespace-nowrap">{time}</span>
      <span className="sr-only">{unavailable ? unavailableLabel : selected ? selectedLabel : ''}</span>
      {selected && <span aria-hidden="true" className="ms-1">✓</span>}
    </button>
  )
}
