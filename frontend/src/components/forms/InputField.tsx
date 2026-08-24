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
        className="mb-1.5 block text-base font-semibold text-[var(--color-text-secondary)] [@media(min-height:760px)]:mb-2"
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={`flex min-h-13 items-center gap-3 rounded-full border bg-[#F9FAFB] px-4 transition-colors focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] [@media(min-height:760px)]:min-h-14 [@media(min-height:760px)]:px-5 ${
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
          className={`min-w-0 flex-1 border-0 bg-transparent py-2.5 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] ${className}`}
          id={id}
        />
        {endAdornment}
      </div>
      {error && (
        <p className="mt-2 px-4 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
