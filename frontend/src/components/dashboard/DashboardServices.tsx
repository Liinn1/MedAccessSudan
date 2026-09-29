import type { ReactNode } from 'react'

export function DashboardServices({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dashboard-services">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <div className="dashboard-services__panel">{children}</div>
    </section>
  )
}
