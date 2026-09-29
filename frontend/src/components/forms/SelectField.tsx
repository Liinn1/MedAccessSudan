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
  variant?: 'default' | 'auth'
  error?: string
}

export function SelectField({ id, label, icon, options, variant = 'default', error, ...selectProps }: SelectFieldProps) {
  const isAuth = variant === 'auth'
  const errorId = `${id}-error`
  return (
    <div>
      <label className={isAuth ? 'mb-1.5 block text-sm font-bold text-[var(--color-text-primary)]' : 'mb-2 block text-base font-semibold text-[var(--color-text-secondary)] sm:text-lg'} htmlFor={id}>{label}</label>
      <div className={isAuth ? `auth-input flex min-h-12 items-center gap-3 rounded-2xl border bg-slate-50 px-3.5 transition focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] ${error ? 'auth-input--invalid' : 'border-[var(--color-border)]'}` : 'flex min-h-14 items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-5 transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]'}>
        <span aria-hidden="true" className="shrink-0 text-[var(--color-primary)]">{icon}</span>
        <select {...selectProps} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} className={`min-w-0 flex-1 appearance-none bg-transparent py-2 text-base text-[var(--color-text-primary)] outline-none ${isAuth ? '' : 'sm:text-lg'}`} id={id}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span aria-hidden="true" className="text-[var(--color-muted)]">⌄</span>
      </div>
      {error && <p className="auth-field-error" id={errorId} role="alert">{error}</p>}
    </div>
  )
}
