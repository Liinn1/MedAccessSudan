import type { ReactNode } from 'react'
import { BookingHero } from './BookingHero'
import { BookingProgress } from './BookingProgress'

export function BookingFlowFrame({
  ariaLabel,
  children,
  currentIndex,
  description,
  eyebrow,
  steps,
  title,
}: {
  ariaLabel: string
  children: ReactNode
  currentIndex: number
  description: string
  eyebrow: string
  steps: Array<{ id: string; label: string; onSelect?: () => void }>
  title: string
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
      <BookingHero description={description} eyebrow={eyebrow} title={title} />
      <BookingProgress ariaLabel={ariaLabel} currentIndex={currentIndex} steps={steps} />
      {children}
    </div>
  )
}
