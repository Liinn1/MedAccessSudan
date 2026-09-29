import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type RevealDirection = 'inline' | 'up'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: RevealDirection
}

/**
 * Reveals content once when it enters the viewport. Content is visible by
 * default; enhancement classes are added only when motion and IntersectionObserver
 * are available, so a script failure never leaves the page hidden.
 */
export function Reveal({ children, delay = 0, direction = 'up', className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!element || reduceMotion || !('IntersectionObserver' in window)) return

    setEnhanced(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`public-reveal public-reveal--${direction} ${enhanced ? 'is-enhanced' : ''} ${visible ? 'is-visible' : ''} ${className}`}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
