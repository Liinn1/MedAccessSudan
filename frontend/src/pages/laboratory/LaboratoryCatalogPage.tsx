import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getLaboratoryCatalog, requestCatalogAddition, saveLaboratoryOffering, type CatalogGroup, type CatalogTest, type NamedOption } from '../../services/laboratoryService'

export function LaboratoryCatalogPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<CatalogGroup[]>([])
  const [categories, setCategories] = useState<NamedOption[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<number, { price: string; hours: string; available: boolean }>>({})
  const [busyId, setBusyId] = useState<number | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestCategory, setRequestCategory] = useState<number | ''>('')
  const [requestNote, setRequestNote] = useState('')
  const arabic = i18n.language.startsWith('ar')

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      getLaboratoryCatalog(query, categoryId === '' ? undefined : categoryId, controller.signal)
        .then((data) => {
          setGroups(data.groups)
          setCategories(data.categories)
          setState('success')
          setDrafts((current) => {
            const next = { ...current }
            data.groups.forEach((group) => group.tests.forEach((test) => {
              if (!next[test.id]) next[test.id] = { price: test.offering?.price ?? '', hours: test.offering ? String(test.offering.estimated_turnaround_hours) : '24', available: test.offering?.is_available ?? true }
            }))
            return next
          })
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
          else setState('error')
        })
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [categoryId, navigate, query])

  const enabledCount = useMemo(() => groups.reduce((count, group) => count + group.tests.filter((test) => test.offering).length, 0), [groups])

  async function save(test: CatalogTest) {
    const draft = drafts[test.id]
    if (!draft) return
    setBusyId(test.id)
    setMessage('')
    try {
      const saved = await saveLaboratoryOffering(test.id, { price: draft.price, estimated_turnaround_hours: Number(draft.hours), is_available: draft.available })
      setGroups((current) => current.map((group) => ({ ...group, tests: group.tests.map((item) => item.id === test.id ? { ...item, offering: saved } : item) })))
      setMessage(t('laboratory.catalog.saved'))
    } catch {
      setMessage(t('laboratory.catalog.saveError'))
    } finally { setBusyId(null) }
  }

  async function submitRequest() {
    if (!requestName.trim()) return
    try {
      await requestCatalogAddition({ suggested_name: requestName.trim(), suggested_lab_test_category_id: requestCategory === '' ? undefined : requestCategory, note: requestNote.trim() || undefined })
      setMessage(t('laboratory.catalog.requestSuccess'))
      setRequestOpen(false)
      setRequestName('')
      setRequestNote('')
    } catch {
      setMessage(t('laboratory.catalog.requestError'))
    }
  }

  return <LaboratoryLayout activeSection="catalog">
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-r from-[var(--color-primary-surface)] to-white p-6 rtl:bg-gradient-to-l sm:p-8">
        <p className="font-bold text-[var(--color-primary)]">{t('laboratory.catalog.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('laboratory.catalog.title')}</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('laboratory.catalog.description')}</p>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <input className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 font-semibold" onChange={(event) => { setQuery(event.target.value); setState('loading') }} placeholder={t('laboratory.catalog.search')} value={query} />
        <select className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 font-semibold" onChange={(event) => { setCategoryId(event.target.value ? Number(event.target.value) : ''); setState('loading') }} value={categoryId}>
          <option value="">{t('laboratory.catalog.allCategories')}</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{arabic ? category.name_ar : category.name_en}</option>)}
        </select>
      </div>
      {message && <p className="mt-4 font-semibold text-[var(--color-primary)]">{message}</p>}
      {state === 'loading' ? <LoadingState contained message={t('laboratory.catalog.loading')} /> : state === 'error' ? <ErrorState contained message={t('laboratory.catalog.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : <>
        {enabledCount === 0 && <div className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-6 text-center"><h2 className="font-extrabold">{t('laboratory.catalog.noneEnabledTitle')}</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('laboratory.catalog.noneEnabled')}</p></div>}
        {groups.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white p-6 text-center text-[var(--color-text-secondary)]">{t('laboratory.catalog.empty')}</p> : groups.map((group) => <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={group.id}>
          <h2 className="text-xl font-extrabold">{arabic ? group.name_ar : group.name_en}</h2>
          <ul className="mt-4 grid gap-3">{group.tests.map((test) => {
            const draft = drafts[test.id] ?? { price: '', hours: '24', available: true }
            return <li className="rounded-2xl border border-[var(--color-border)] p-4" key={test.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-extrabold">{arabic ? test.name_ar : test.name_en}{test.short_name ? ` (${test.short_name})` : ''}</p></div>
                <label className="flex items-center gap-2 text-sm font-bold"><input checked={draft.available} onChange={(event) => setDrafts((current) => ({ ...current, [test.id]: { ...draft, available: event.target.checked } }))} type="checkbox" />{t('laboratory.catalog.available')}</label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.catalog.price')}<input className="mt-1 min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3" inputMode="decimal" onChange={(event) => setDrafts((current) => ({ ...current, [test.id]: { ...draft, price: event.target.value } }))} value={draft.price} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('laboratory.catalog.turnaround')}<input className="mt-1 min-h-11 w-full rounded-xl border border-[var(--color-border)] px-3" inputMode="numeric" min={1} onChange={(event) => setDrafts((current) => ({ ...current, [test.id]: { ...draft, hours: event.target.value } }))} value={draft.hours} /></label>
                <button className="mt-5 min-h-11 rounded-full bg-[var(--color-primary)] px-5 font-bold text-white disabled:opacity-50" disabled={busyId === test.id} onClick={() => save(test)} type="button">{t(busyId === test.id ? 'laboratory.catalog.saving' : 'laboratory.catalog.save')}</button>
              </div>
            </li>
          })}</ul>
        </section>)}
        <section className="mt-6 rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-5">
          <h2 className="font-extrabold">{t('laboratory.catalog.requestTitle')}</h2>
          {!requestOpen ? <button className="mt-3 rounded-full bg-white px-5 py-2.5 font-bold text-[var(--color-primary)]" onClick={() => setRequestOpen(true)} type="button">{t('laboratory.catalog.requestAction')}</button> : <div className="mt-4 grid gap-3">
            <input className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white px-3" onChange={(event) => setRequestName(event.target.value)} placeholder={t('laboratory.catalog.requestName')} value={requestName} />
            <select className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white px-3" onChange={(event) => setRequestCategory(event.target.value ? Number(event.target.value) : '')} value={requestCategory}>
              <option value="">{t('laboratory.catalog.requestCategory')}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{arabic ? category.name_ar : category.name_en}</option>)}
            </select>
            <textarea className="min-h-24 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2" onChange={(event) => setRequestNote(event.target.value)} placeholder={t('laboratory.catalog.requestNote')} value={requestNote} />
            <button className="min-h-11 w-fit rounded-full bg-[var(--color-primary)] px-5 font-bold text-white" onClick={submitRequest} type="button">{t('laboratory.catalog.requestSubmit')}</button>
          </div>}
        </section>
      </>}
    </div>
  </LaboratoryLayout>
}
