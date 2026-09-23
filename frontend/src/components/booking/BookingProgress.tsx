interface BookingProgressStep {
  id: string
  label: string
  onSelect?: () => void
}

interface BookingProgressProps {
  ariaLabel: string
  currentIndex: number
  steps: BookingProgressStep[]
}

export function BookingProgress({ ariaLabel, currentIndex, steps }: BookingProgressProps) {
  return (
    <ol aria-label={ariaLabel} className="mt-5 grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const reached = index <= currentIndex
        const className = `w-full rounded-full px-2 py-2 text-center text-xs font-bold sm:text-sm ${reached ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`
        return (
          <li key={step.id}>
            {step.onSelect ? (
              <button aria-current={index === currentIndex ? 'step' : undefined} className={`${className} transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`} onClick={step.onSelect} type="button">
                {step.label}
              </button>
            ) : (
              <span aria-current={index === currentIndex ? 'step' : undefined} className={`block ${className}`}>
                {step.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
