import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon: ReactNode
  error?: string
  endAdornment?: ReactNode
}

/**
 * Shared labeled input with accessible error association and optional controls.
 * The surrounding layout uses logical spacing so it mirrors naturally in RTL.
 */
export function InputField({
  id,
  label,
  icon,
  error,
  endAdornment,
  className = '',
  ...inputProps
}: InputFieldProps) {
  const errorId = `${id}-error`

  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-bold text-[var(--color-text-primary)]"
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={`auth-input flex min-h-12 items-center gap-3 rounded-2xl border bg-slate-50 px-3.5 transition focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] ${
          error ? 'auth-input--invalid' : 'border-[var(--color-border)]'
        }`}
      >
        <span aria-hidden="true" className="shrink-0 text-[var(--color-primary)]">
          {icon}
        </span>
        <input
          {...inputProps}
          aria-describedby={error ? errorId : inputProps['aria-describedby']}
          aria-invalid={Boolean(error)}
          className={`min-w-0 flex-1 border-0 bg-transparent py-2 text-base text-[var(--color-text-primary)] outline-none placeholder:text-slate-400 ${className}`}
          id={id}
        />
        {endAdornment}
      </div>
      {error && (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
