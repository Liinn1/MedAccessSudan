import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
import { useSignUpModal } from '../contexts/signUpModal'

interface PublicLayoutProps {
  children: ReactNode
}

/** Shared chrome for public routes: sticky header, main landmark, and footer. */
export function PublicLayout({ children }: PublicLayoutProps) {
  const openSignUpModal = useSignUpModal()
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return

    // Hash links may arrive after React Router mounts the destination page.
    // getElementById never evaluates the hash as CSS/JS; the pattern only accepts real element IDs.
    let sectionId = location.hash.slice(1)
    try {
      sectionId = decodeURIComponent(sectionId)
    } catch {
      return
    }
    if (!/^[A-Za-z][\w-]*$/.test(sectionId)) return

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, location.pathname])

  const isPublicAuthRoute = /^(?:\/login|\/register(?:\/patient|\/doctor)?)$/.test(location.pathname)

  return (
    <div className={isPublicAuthRoute ? 'auth-public-layout flex min-h-dvh flex-col bg-[var(--color-background)]' : 'min-h-dvh bg-[var(--color-background)]'}>
      <PublicHeader onSignUp={openSignUpModal} />
      <main className={isPublicAuthRoute ? 'page-enter flex min-h-0 flex-1 flex-col' : 'page-enter'}>{children}</main>
      {/* Auth pages must fit the remaining viewport under the header; the public footer would force extra scroll. */}
      {!isPublicAuthRoute && <PublicFooter />}
    </div>
  )
}
