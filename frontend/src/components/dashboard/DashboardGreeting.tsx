interface DashboardGreetingProps {
  greeting: string
  description: string
  aside?: string
}

/** Simple in-page greeting — not a hero banner. */
export function DashboardGreeting({ greeting, description, aside }: DashboardGreetingProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl" dir="auto">{greeting}</h1>
        <p className="mt-2 max-w-xl text-[var(--color-text-secondary)]">{description}</p>
      </div>
      {aside && <p className="max-w-xs text-sm font-semibold leading-relaxed text-[var(--color-text-secondary)] sm:pt-1 sm:text-end">{aside}</p>}
    </header>
  )
}
