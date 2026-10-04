export function ProfileTabs<T extends string>({
  tabs,
  value,
  onChange,
  labelFor,
}: {
  tabs: readonly T[]
  value: T
  onChange: (tab: T) => void
  labelFor: (tab: T) => string
}) {
  return (
    <div className="-mx-1 mt-6 overflow-x-auto" role="tablist">
      <div className="flex w-max min-w-full gap-2 px-1 pb-0.5">
        {tabs.map((tab) => {
          const active = tab === value
          return (
            <button
              aria-selected={active}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
              key={tab}
              onClick={() => onChange(tab)}
              role="tab"
              type="button"
            >
              {labelFor(tab)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
