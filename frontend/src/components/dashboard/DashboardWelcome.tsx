interface DashboardWelcomeProps {
  eyebrow: string
  greeting: string
  title: string
  description: string
}

export function DashboardWelcome({ eyebrow, greeting, title, description }: DashboardWelcomeProps) {
  return (
    <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white px-4 py-4 rtl:bg-gradient-to-l sm:px-7 sm:py-6">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)] sm:text-sm">{eyebrow}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)] sm:text-base">{greeting}</p>
      <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)] sm:mt-2">{description}</p>
    </header>
  )
}
