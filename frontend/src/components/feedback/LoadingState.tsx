interface LoadingStateProps {
  message: string
  contained?: boolean
  section?: boolean
}

export function LoadingState({ message, contained = false, section = false }: LoadingStateProps) {
  return (
    <div aria-busy="true" className={`grid place-items-center bg-[var(--color-background)] px-5 ${section ? 'min-h-40 rounded-2xl' : contained ? 'min-h-[55dvh]' : 'min-h-dvh'}`}>
      <div className="page-enter flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
        <span aria-hidden="true" className="size-11 animate-spin rounded-full border-4 border-[var(--color-primary-surface)] border-t-[var(--color-primary)] motion-reduce:animate-none" />
        <p className="text-base font-medium text-[var(--color-text-secondary)]">{message}</p>
      </div>
    </div>
  )
}
