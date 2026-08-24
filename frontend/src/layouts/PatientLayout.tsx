import type { ReactNode } from 'react'
import { PatientAppHeader } from '../components/navigation/PatientAppHeader'
import { PublicFooter } from '../components/public/PublicFooter'

interface PatientLayoutProps {
  children: ReactNode
  isLoggingOut: boolean
  onAppointments: () => void
  onDashboard: () => void
  onLogout: () => void
  onProfile: () => void
}

export function PatientLayout({ children, ...headerProps }: PatientLayoutProps) {
  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <PatientAppHeader {...headerProps} />
      <main className="page-enter">{children}</main>
      <PublicFooter />
    </div>
  )
}
