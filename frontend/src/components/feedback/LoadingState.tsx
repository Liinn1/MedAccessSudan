interface LoadingStateProps {
  message: string
  contained?: boolean
}

export function LoadingState({ message, contained = false }: LoadingStateProps) {
  return (
    <div className={`grid place-items-center bg-[var(--color-background)] px-5 ${contained ? 'min-h-[55dvh]' : 'min-h-dvh'}`}>
      <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
        <span aria-hidden="true" className="size-11 animate-spin rounded-full border-4 border-[var(--color-primary-surface)] border-t-[var(--color-primary)] motion-reduce:animate-none" />
        <p className="text-base font-medium text-[var(--color-text-secondary)]">{message}</p>
      </div>
    </div>
  )
}
