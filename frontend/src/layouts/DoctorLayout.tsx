import type { ReactNode } from 'react'
import { DoctorAppHeader } from '../components/navigation/DoctorAppHeader'
import { PublicFooter } from '../components/public/PublicFooter'

interface DoctorLayoutProps {
  activeSection?: 'dashboard' | 'appointments' | 'availability' | 'profile'
  children: ReactNode
  isLoggingOut: boolean
  onAppointments: () => void
  onAvailability: () => void
  onLogout: () => void
  onProfile: () => void
}

export function DoctorLayout({ children, ...headerProps }: DoctorLayoutProps) {
  return <div className="min-h-dvh bg-[var(--color-background)]"><DoctorAppHeader {...headerProps} /><main className="page-enter">{children}</main><PublicFooter /></div>
}
