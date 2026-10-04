import type { ReactNode } from 'react'

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-bold text-[var(--color-primary)]">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-text-secondary)]">{description}</p>
      </div>
      {action}
    </header>
  )
}
