interface BookingHeroProps {
  eyebrow: string
  title: string
  description: string
}

export function BookingHero({ eyebrow, title, description }: BookingHeroProps) {
  return (
    <header className="rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-6 rtl:bg-gradient-to-l sm:p-8">
      <p className="font-bold text-amber-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{description}</p>
    </header>
  )
}
