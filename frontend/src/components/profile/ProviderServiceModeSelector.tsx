export type ProviderServiceMode = 'onsite' | 'home' | 'both' | ''

interface ModeOption {
  value: Exclude<ProviderServiceMode, ''>
  label: string
  description: string
}

export function ProviderServiceModeSelector({ error, legend, name, onChange, options, value }: { error?: string; legend: string; name: string; onChange: (value: Exclude<ProviderServiceMode, ''>) => void; options: ModeOption[]; value: ProviderServiceMode }) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} className="rounded-2xl border border-[var(--color-border)] p-3">
      <legend className="px-1 font-semibold">{legend}</legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-xl border p-2.5 transition ${value === option.value ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)]' : 'border-transparent hover:bg-[var(--color-primary-surface)]'}`} key={option.value}>
            <input checked={value === option.value} className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]" name={name} onChange={() => onChange(option.value)} type="radio" value={option.value} />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-0.5 block text-xs font-normal leading-snug text-[var(--color-text-secondary)]">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[var(--color-danger)]" id={`${name}-error`}>{error}</p>}
    </fieldset>
  )
}
