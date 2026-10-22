import { useMemo, useState } from 'react'

export interface SearchableSelectOption { value: string; label: string }

export function SearchableSelectField({ error, id, label, onChange, options, placeholder, searchLabel, value }: {
  error?: string; id: string; label: string; onChange: (value: string) => void; options: SearchableSelectOption[]; placeholder: string; searchLabel: string; value: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => options.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [options, query])
  return <div className="relative">
    <label className="mb-2 block text-sm font-bold" htmlFor={id}>{label}</label>
    <button aria-expanded={open} aria-haspopup="listbox" className={`flex min-h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-start ${error ? 'border-red-500' : 'border-[var(--color-border)]'}`} id={id} onClick={() => setOpen((current) => !current)} type="button">
      <span className={selected ? '' : 'text-[var(--color-text-muted)]'}>{selected?.label ?? placeholder}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-lg">
      <input aria-label={searchLabel} autoFocus className="mb-2 min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3" onChange={(event) => setQuery(event.target.value)} placeholder={searchLabel} value={query} />
      <ul className="max-h-56 overflow-y-auto" role="listbox">{filtered.map((option) => <li aria-selected={option.value === value} key={option.value} role="option"><button className="w-full rounded-xl px-3 py-2 text-start hover:bg-[var(--color-primary-surface)]" onClick={() => { onChange(option.value); setOpen(false); setQuery('') }} type="button">{option.label}</button></li>)}</ul>
    </div>}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
}
