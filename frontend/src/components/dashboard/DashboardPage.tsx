import type { ReactNode } from 'react'

/** Shared dashboard content width, padding, and vertical rhythm. */
export function DashboardPage({ children }: { children: ReactNode }) {
  return <div className="dashboard-page">{children}</div>
}
