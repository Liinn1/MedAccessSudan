import { useEffect, useRef } from 'react'

export function useBookingStepFocus(step: string) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  return headingRef
}
