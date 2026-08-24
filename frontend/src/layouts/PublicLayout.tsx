import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
import { useSignUpModal } from '../contexts/signUpModal'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const openSignUpModal = useSignUpModal()
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ block: 'start' }))
  }, [location.hash, location.pathname])

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <PublicHeader onSignUp={openSignUpModal} />
      <main className="page-enter">{children}</main>
      <PublicFooter />
    </div>
  )
}
