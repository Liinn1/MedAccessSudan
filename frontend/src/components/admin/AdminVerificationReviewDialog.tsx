import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'
import { ActionButton } from '../buttons/ActionButton'
import { ConfirmationDialog } from '../feedback/ConfirmationDialog'
import { ContextualFeedback, type ContextualFeedbackState } from '../feedback/ContextualFeedback'
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
  type VerificationDocumentPayload,
} from '../../services/providerVerificationService'

function firstValidationMessage(caught: unknown): string | null {
  if (!(caught instanceof ApiError) || caught.status !== 422) return null
  const details = caught.details
  if (typeof details !== 'object' || details === null || !('errors' in details)) {
    return caught.message || null
  }
  const errors = (details as { errors?: Record<string, string[]> }).errors
  const first = errors ? Object.values(errors).flat()[0] : undefined
  return first || caught.message || null
}

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
  const { i18n, t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<ProviderVerificationPayload | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<ContextualFeedbackState>(null)
  const [confirmVerify, setConfirmVerify] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [replaceDoc, setReplaceDoc] = useState<VerificationDocumentPayload | null>(null)
  const [replaceReason, setReplaceReason] = useState('')
  const [replaceError, setReplaceError] = useState('')

  useEffect(() => {
    if (!open || !item) return
    setError(''); setNote(''); setDetail(null); setFeedback(null); setReplaceDoc(null); setReplaceReason('')
    getAdminVerification(item.id).then(setDetail).catch(() => setError(t('admin.errors.action')))
  }, [item, open, t])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy && !replaceDoc) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose, open, replaceDoc])

  if (!open || !item) return null

  const allDocumentsApproved = Boolean(detail && (detail.approved_count ?? 0) === detail.required_count && detail.required_count > 0)

  async function run(key: string, action: () => Promise<ProviderVerificationPayload>, successKey?: string) {
    setBusy(key); setError(''); setFeedback(null)
    try {
      setDetail(await action())
      await onUpdated()
      if (successKey) setFeedback({ type: 'success', messageKey: successKey })
    } catch (caught) {
      setError(firstValidationMessage(caught) || t(caught instanceof ApiError && caught.status === 422 ? 'admin.errors.validation' : 'admin.errors.action'))
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

  function documentBadgeStatus(status: string) {
    if (status === 'rejected') return 'action_required'
    if (status === 'approved') return 'verified'
    return 'under_review'
  }

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy && !replaceDoc) onClose() }}>
      <div aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" ref={dialogRef} role="dialog">
        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${verificationBadgeClass(item.status)}`}>{t(`verification.statuses.${item.status}`)}</span>
        <h2 className="mt-4 text-2xl font-extrabold" id={titleId}>{t('admin.providers.documents')}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{item.provider_name} · {t(`roles.${item.provider_type}`)}</p>
        {item.submitted_at && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('verification.submittedOn')}: {new Intl.DateTimeFormat(i18n.language.startsWith('ar') ? 'ar' : 'en', { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(item.submitted_at))}</p>}
        {detail?.profile_summary && (
          <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            {detail.profile_summary.email && <div><dt className="text-sm font-bold text-slate-500">{t('admin.table.email')}</dt><dd>{detail.profile_summary.email}</dd></div>}
            {detail.profile_summary.phone && <div><dt className="text-sm font-bold text-slate-500">{t('admin.table.phone')}</dt><dd>{detail.profile_summary.phone}</dd></div>}
            {detail.profile_summary.specialization && <div><dt className="text-sm font-bold text-slate-500">{t('admin.providers.specialty')}</dt><dd>{i18n.language.startsWith('ar') ? detail.profile_summary.specialization.name_ar : detail.profile_summary.specialization.name_en}</dd></div>}
            {detail.profile_summary.location && <div><dt className="text-sm font-bold text-slate-500">{t('admin.providers.city')}</dt><dd>{i18n.language.startsWith('ar') ? detail.profile_summary.location.name_ar : detail.profile_summary.location.name_en}</dd></div>}
            {detail.profile_summary.clinic_name && <div><dt className="text-sm font-bold text-slate-500">{t('admin.users.clinicName')}</dt><dd>{detail.profile_summary.clinic_name}</dd></div>}
            {detail.profile_summary.address && <div><dt className="text-sm font-bold text-slate-500">{t('admin.labs.address')}</dt><dd>{detail.profile_summary.address}</dd></div>}
          </dl>
        )}
        {detail && (
          <ul className="mt-6 space-y-3">
            {detail.requirements.map((requirement) => {
              const current = requirement.current
              const replacementRequested = current?.status === 'rejected'
              const approved = current?.status === 'approved'
              return (
                <li className="rounded-2xl border border-[var(--color-border)] p-4" key={requirement.document_type}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold">{t(`verification.types.${requirement.document_type}`)}</p>
                      <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{current?.original_filename ?? t('verification.required')}</p>
                    </div>
                    {current && <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(documentBadgeStatus(current.status))}`}>{t(`verification.documentStatuses.${current.status}`)}</span>}
                  </div>
                  {replacementRequested && current.admin_note && (
                    <p className="mt-3 break-words rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('verification.reason')}: {current.admin_note}</p>
                  )}
                  {current && <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton onClick={() => view(current.id)} size="sm" variant="secondary">{t('verification.view')}</ActionButton>
                    {!approved && !replacementRequested && (
                      <ActionButton disabled={Boolean(busy)} onClick={() => run(`approve-${current.id}`, () => reviewAdminVerificationDocument(detail.id, current.id, 'approved'))} size="sm" variant="secondary">{t('admin.actions.approveDocument')}</ActionButton>
                    )}
                    {!replacementRequested && (
                      <ActionButton disabled={Boolean(busy)} onClick={() => { setReplaceDoc(current); setReplaceReason(''); setReplaceError('') }} size="sm" variant="danger">{t('admin.actions.rejectDocument')}</ActionButton>
                    )}
                  </div>}
                </li>
              )
            })}
          </ul>
        )}
        <label className="mt-6 block font-bold">{t('verification.reason')}
          <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setNote(event.target.value)} value={note} />
        </label>
        <ContextualFeedback feedback={feedback} />
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton disabled={Boolean(busy)} onClick={onClose} size="lg" variant="tertiary">{t('admin.actions.cancel')}</ActionButton>
          <ActionButton disabled={Boolean(busy) || note.trim() === ''} onClick={() => setConfirmReject(true)} size="lg" variant="danger">{t('admin.actions.reject')}</ActionButton>
          <ActionButton disabled={Boolean(busy) || !allDocumentsApproved} onClick={() => setConfirmVerify(true)} size="lg" variant="primary">{t('admin.actions.approveVerification')}</ActionButton>
        </div>
      </div>
      <ConfirmationDialog
        busy={busy === 'changes'}
        cancelLabel={t('admin.actions.cancel')}
        confirmLabel={t('admin.actions.reject')}
        description={t('admin.confirm.rejectProvider')}
        loadingLabel={t('admin.actions.working')}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => { setConfirmReject(false); void run('changes', () => requestAdminVerificationChanges(item.id, note.trim())) }}
        open={confirmReject}
        title={t('admin.confirm.rejectProviderTitle')}
      />
      <ConfirmationDialog
        busy={busy === 'approve'}
        cancelLabel={t('admin.actions.cancel')}
        confirmLabel={t('admin.actions.approveVerification')}
        description={t('admin.confirm.verifyProvider')}
        loadingLabel={t('admin.actions.working')}
        onCancel={() => setConfirmVerify(false)}
        onConfirm={() => { setConfirmVerify(false); void run('approve', () => approveAdminVerification(item.id)) }}
        open={confirmVerify}
        title={t('admin.confirm.verifyProviderTitle')}
      />
      <ConfirmationDialog
        busy={Boolean(replaceDoc) && busy === `reject-${replaceDoc?.id}`}
        cancelLabel={t('admin.actions.cancel')}
        confirmDisabled={replaceReason.trim() === ''}
        confirmLabel={t('admin.actions.rejectDocument')}
        details={replaceDoc ? (
          <label className="block font-bold">
            {t('verification.reason')} *
            <textarea
              className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--color-border)] px-4 py-3 font-semibold"
              onChange={(event) => { setReplaceReason(event.target.value); setReplaceError('') }}
              placeholder={t('admin.confirm.replaceDocumentPlaceholder')}
              value={replaceReason}
            />
          </label>
        ) : null}
        error={replaceError}
        loadingLabel={t('admin.actions.working')}
        onCancel={() => { if (!busy) { setReplaceDoc(null); setReplaceReason(''); setReplaceError('') } }}
        onConfirm={() => {
          if (!replaceDoc || !detail) return
          const reason = replaceReason.trim()
          if (!reason) {
            setReplaceError(t('admin.confirm.replaceDocumentRequired'))
            return
          }
          void run(`reject-${replaceDoc.id}`, async () => {
            const payload = await reviewAdminVerificationDocument(detail.id, replaceDoc.id, 'rejected', reason)
            setReplaceDoc(null)
            setReplaceReason('')
            return payload
          }, 'admin.messages.replacementRequested')
        }}
        open={Boolean(replaceDoc)}
        title={t('admin.confirm.replaceDocumentTitle')}
        description={replaceDoc ? t('admin.confirm.replaceDocument', { document: t(`verification.types.${replaceDoc.document_type}`) }) : t('admin.confirm.replaceDocumentHelp')}
      />
    </div>
  )
}
