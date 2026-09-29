import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../services/apiClient'
import {
  approveAdminVerification,
  downloadVerificationDocument,
  getAdminVerification,
  requestAdminVerificationChanges,
  reviewAdminVerificationDocument,
  verificationBadgeClass,
  type ProviderVerificationListItem,
  type ProviderVerificationPayload,
} from '../../services/providerVerificationService'

export function AdminVerificationReviewDialog({
  item,
  open,
  onClose,
  onUpdated,
}: {
  item: ProviderVerificationListItem | null
  open: boolean
  onClose: () => void
  onUpdated: () => Promise<unknown> | unknown
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ProviderVerificationPayload | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !item) return
    setError(''); setNote(''); setDetail(null)
    getAdminVerification(item.id).then(setDetail).catch(() => setError(t('admin.errors.action')))
  }, [item, open, t])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose, open])

  if (!open || !item) return null

  async function run(key: string, action: () => Promise<ProviderVerificationPayload>) {
    setBusy(key); setError('')
    try {
      setDetail(await action())
      await onUpdated()
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 422 ? t('admin.errors.validation') : t('admin.errors.action'))
    } finally { setBusy('') }
  }

  async function view(documentId: number) {
    if (!item) return
    try {
      const { blob, filename } = await downloadVerificationDocument('admin', documentId, item.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      void filename
    } catch { setError(t('verification.viewError')) }
  }

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" ref={dialogRef} role="dialog">
        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${verificationBadgeClass(item.status)}`}>{t(`verification.statuses.${item.status}`)}</span>
        <h2 className="mt-4 text-2xl font-extrabold" id={titleId}>{t('admin.providers.documents')}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{item.provider_name} · {t(`roles.${item.provider_type}`)}</p>
        {detail && (
          <ul className="mt-6 space-y-3">
            {detail.requirements.map((requirement) => {
              const current = requirement.current
              return (
                <li className="rounded-2xl border border-[var(--color-border)] p-4" key={requirement.document_type}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold">{t(`verification.types.${requirement.document_type}`)}</p>
                      <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{current?.original_filename ?? t('verification.required')}</p>
                    </div>
                    {current && <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(current.status === 'rejected' ? 'action_required' : current.status === 'approved' ? 'verified' : 'under_review')}`}>{t(`verification.documentStatuses.${current.status}`)}</span>}
                  </div>
                  {current && <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-full border px-4 py-2 text-sm font-bold" onClick={() => view(current.id)} type="button">{t('verification.view')}</button>
                    <button className="rounded-full border border-teal-200 px-4 py-2 text-sm font-bold text-[var(--color-primary)]" disabled={Boolean(busy)} onClick={() => run(`approve-${current.id}`, () => reviewAdminVerificationDocument(detail.id, current.id, 'approved'))} type="button">{t('admin.actions.approveDocument')}</button>
                    <button className="rounded-full border px-4 py-2 text-sm font-bold" disabled={Boolean(busy) || note.trim() === ''} onClick={() => run(`reject-${current.id}`, () => reviewAdminVerificationDocument(detail.id, current.id, 'rejected', note.trim()))} type="button">{t('admin.actions.rejectDocument')}</button>
                  </div>}
                </li>
              )
            })}
          </ul>
        )}
        <label className="mt-6 block font-bold">{t('verification.reason')}
          <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setNote(event.target.value)} value={note} />
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-12 rounded-full border px-6 font-bold" disabled={Boolean(busy)} onClick={onClose} type="button">{t('admin.actions.cancel')}</button>
          <button className="min-h-12 rounded-full border px-6 font-bold" disabled={Boolean(busy) || note.trim() === ''} onClick={() => run('changes', () => requestAdminVerificationChanges(item.id, note.trim()))} type="button">{busy === 'changes' ? t('admin.actions.working') : t('admin.actions.requestChanges')}</button>
          <button className="min-h-12 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white" disabled={Boolean(busy)} onClick={() => run('approve', () => approveAdminVerification(item.id))} type="button">{busy === 'approve' ? t('admin.actions.working') : t('admin.actions.approveVerification')}</button>
        </div>
      </div>
    </div>
  )
}
