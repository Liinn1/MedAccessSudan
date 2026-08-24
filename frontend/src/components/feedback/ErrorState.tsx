interface ErrorStateProps {
  message: string
  retryLabel: string
  onRetry: () => void
  contained?: boolean
}

export function ErrorState({ message, retryLabel, onRetry, contained = false }: ErrorStateProps) {
  return (
    <div className={`grid place-items-center bg-[var(--color-background)] px-5 ${contained ? 'min-h-[55dvh]' : 'min-h-dvh'}`}>
      <div className="max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
        <p className="text-base text-[var(--color-text-secondary)]" role="alert">{message}</p>
        <button className="mt-5 min-h-11 rounded-full bg-[var(--color-primary)] px-6 py-2 font-bold text-white hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={onRetry} type="button">{retryLabel}</button>
      </div>
    </div>
  )
}
