import type { ReactNode, SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  icon: ReactNode
  options: SelectOption[]
}

export function SelectField({ id, label, icon, options, ...selectProps }: SelectFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-base font-semibold text-[var(--color-text-secondary)] sm:text-lg" htmlFor={id}>{label}</label>
      <div className="flex min-h-14 items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-5 transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]">
        <span aria-hidden="true" className="shrink-0 text-[var(--color-primary)]">{icon}</span>
        <select {...selectProps} className="min-w-0 flex-1 appearance-none bg-transparent py-3 text-base text-[var(--color-text-primary)] outline-none sm:text-lg" id={id}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span aria-hidden="true" className="text-[var(--color-muted)]">⌄</span>
      </div>
    </div>
  )
}
