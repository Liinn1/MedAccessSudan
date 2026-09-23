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
        className={`auth-input flex min-h-12 items-center gap-3 rounded-xl border bg-white px-3.5 transition focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-primary-surface)]/25 focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] ${
          error ? 'border-red-500' : 'border-[var(--color-border)]'
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
        <p className="mt-1.5 px-3.5 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
