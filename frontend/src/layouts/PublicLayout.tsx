import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
import { SignUpChoiceModal } from '../components/public/SignUpChoiceModal'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [signupOpen, setSignupOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ block: 'start' }))
  }, [location.hash, location.pathname])

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <PublicHeader onSignUp={() => setSignupOpen(true)} />
      <main className="page-enter">{children}</main>
      <PublicFooter />
      <SignUpChoiceModal onClose={() => setSignupOpen(false)} open={signupOpen} />
    </div>
  )
}
