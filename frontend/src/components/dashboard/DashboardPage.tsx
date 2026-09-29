import type { ReactNode } from 'react'

/** Shared Patient-style dashboard width and page padding. */
export function DashboardPage({ children }: { children: ReactNode }) {
  return <div className="dashboard-page">{children}</div>
}
