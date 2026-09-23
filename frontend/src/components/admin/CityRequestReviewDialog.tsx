import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminLocation, CityProposal } from '../../services/adminService'

type Resolution =
  | { action: 'approve'; name_en: string }
  | { action: 'map'; location_id: number }
  | { action: 'reject' }

interface CityRequestReviewDialogProps {
  open: boolean
  proposal: CityProposal | null
  locations: AdminLocation[]
  busy: boolean
  error?: string
  onClose: () => void
  onResolve: (resolution: Resolution) => void
}

function normalizeCityName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function CityRequestReviewDialog({ open, proposal, locations, busy, error, onClose, onResolve }: CityRequestReviewDialogProps) {
  const { i18n, t } = useTranslation()
  const titleId = useId(); const descriptionId = useId(); const dialogRef = useRef<HTMLDivElement>(null); const returnFocusRef = useRef<HTMLElement | null>(null)
  const [officialName, setOfficialName] = useState(() => proposal?.proposed_name.trim().replace(/\s+/g, ' ') ?? ''); const [locationId, setLocationId] = useState(() => String(proposal?.likely_matches[0]?.id ?? ''))
  const activeLocations = useMemo(() => locations.filter((location) => location.is_active), [locations])
  const exactMatch = activeLocations.find((location) => [location.name_en, location.name_ar].some((name) => normalizeCityName(name) === normalizeCityName(officialName)))

  useEffect(() => { if (!open || !proposal) return; returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus()); return () => returnFocusRef.current?.focus() }, [open, proposal])
  useEffect(() => { if (!open) return; const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose() }; document.addEventListener('keydown', keydown); return () => document.removeEventListener('keydown', keydown) }, [busy, onClose, open])
  if (!open || !proposal) return null
  const localized = (location: AdminLocation) => i18n.language.startsWith('ar') ? location.name_ar : location.name_en

  return <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><div aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" ref={dialogRef} role="dialog"><span className="inline-flex rounded-full bg-[var(--color-primary-surface)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">{t('admin.statuses.pending')}</span><h2 className="mt-4 text-2xl font-extrabold" id={titleId}>{t('admin.cityReview.title')}</h2><p className="mt-2 text-[var(--color-text-secondary)]" id={descriptionId}>{t('admin.cityReview.description')}</p>
    <dl className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="text-sm font-bold text-slate-500">{t('admin.cityReview.original')}</dt><dd className="mt-1 text-lg font-bold">{proposal.proposed_name}</dd></div><div><dt className="text-sm font-bold text-slate-500">{t('admin.cities.provider')}</dt><dd className="mt-1 font-bold">{proposal.doctor.name}</dd><dd className="text-sm text-slate-500">{proposal.doctor.email}</dd></div></dl>
    <label className="mt-6 block font-bold" htmlFor="official-city-name">{t('admin.cityReview.officialName')}</label><input className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" id="official-city-name" onChange={(event) => setOfficialName(event.target.value)} value={officialName}/>
    {exactMatch && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">{t('admin.cityReview.duplicateFound')}</p><p>{t('admin.cityReview.mapInstead', { city: localized(exactMatch) })}</p></div>}
    <label className="mt-5 block font-bold" htmlFor="existing-city-match">{t('admin.cities.existingMatch')}</label><select className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3" id="existing-city-match" onChange={(event) => setLocationId(event.target.value)} value={exactMatch ? String(exactMatch.id) : locationId}><option value="">{t('admin.cities.chooseExisting')}</option>{activeLocations.map((location) => <option key={location.id} value={location.id}>{localized(location)}</option>)}</select>
    {proposal.likely_matches.length > 0 && <p className="mt-2 text-sm text-slate-500">{t('admin.cities.likely')}: {proposal.likely_matches.map((match) => localized(match)).join(', ')}</p>}{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
    <div className="mt-7 flex flex-wrap justify-end gap-3"><button className="rounded-full border px-5 py-3 font-bold" disabled={busy} onClick={onClose}>{t('admin.cityReview.cancel')}</button><button className="rounded-full border border-red-200 px-5 py-3 font-bold text-red-700" disabled={busy} onClick={() => onResolve({ action: 'reject' })}>{t('admin.actions.reject')}</button><button className="rounded-full border border-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-primary)] disabled:opacity-50" disabled={busy || !(exactMatch || locationId)} onClick={() => onResolve({ action: 'map', location_id: Number(exactMatch?.id ?? locationId) })}>{t('admin.actions.map')}</button><button className="rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={busy || !officialName.trim() || Boolean(exactMatch)} onClick={() => onResolve({ action: 'approve', name_en: officialName })}>{busy ? t('admin.cityReview.working') : t('admin.actions.approveNew')}</button></div>
  </div></div>
}
