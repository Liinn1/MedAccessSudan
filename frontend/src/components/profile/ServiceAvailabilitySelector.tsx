interface ServiceAvailabilityOption {
  key: string
  label: string
  checked: boolean
  disabled?: boolean
  description?: string
  onChange?: (checked: boolean) => void
}

export function ServiceAvailabilitySelector({ legend, options }: { legend: string; options: ServiceAvailabilityOption[] }) {
  return (
    <fieldset className="rounded-2xl border border-[var(--color-border)] p-4">
      <legend className="px-1 font-semibold">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label className="flex min-w-0 items-start gap-3 rounded-xl p-2 font-semibold transition hover:bg-[var(--color-primary-surface)]" key={option.key}>
            <input
              checked={option.checked}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
              disabled={option.disabled}
              onChange={(event) => option.onChange?.(event.target.checked)}
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block">{option.label}</span>
              {option.description && <span className="mt-1 block text-sm font-normal text-[var(--color-text-secondary)]">{option.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
