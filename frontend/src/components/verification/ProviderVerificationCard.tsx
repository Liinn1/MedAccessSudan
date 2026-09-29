import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../services/apiClient'
import {
  downloadVerificationDocument,
  submitProviderVerification,
  uploadVerificationDocument,
  verificationBadgeClass,
  type ProviderVerificationPayload,
} from '../../services/providerVerificationService'

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
const maxBytes = 8 * 1024 * 1024

export function ProviderVerificationCard({
  role,
  verification,
  onChange,
}: {
  role: 'doctor' | 'laboratory'
  verification: ProviderVerificationPayload | null
  onChange: (payload: ProviderVerificationPayload) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!verification) return null
  const status = verification.status
  const action = status === 'pending_documents' ? 'complete' : status === 'action_required' ? 'review' : status === 'under_review' ? 'view' : null

  return (
    <section className="rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-6" id="account-verification">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold">{t('verification.title')}</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(status)}`}>{t(`verification.statuses.${status}`)}</span>
      </div>
      <p className="mt-3 break-words text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`verification.summaries.${status}`)}</p>
      {status === 'pending_documents' && <p className="mt-3 text-sm font-semibold">{t('verification.progress', { submitted: verification.submitted_count, required: verification.required_count })}</p>}
      {status === 'action_required' && verification.admin_note && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">{t('verification.reason')}</p>
          <p className="mt-1 break-words text-sm text-amber-900">{verification.admin_note}</p>
        </div>
      )}
      {action && <button className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white" onClick={() => setOpen(true)} type="button">{t(`verification.actions.${action}`)}</button>}
      <ProviderVerificationDialog onChange={onChange} onClose={() => setOpen(false)} open={open} role={role} verification={verification} />
    </section>
  )
}

export function DashboardVerificationNotice({
  status,
  onOpen,
}: {
  role?: 'doctor' | 'laboratory'
  status?: string | null
  onOpen: () => void
}) {
  const { t } = useTranslation()
  if (!status || status === 'verified') return null
  const key = status === 'under_review' ? 'underReview' : status === 'action_required' ? 'actionRequired' : 'required'

  return (
    <article className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold">{t(`verification.notice.${key}.title`)}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t(`verification.notice.${key}.body`)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(status)}`}>{t(`verification.statuses.${status}`, { defaultValue: status })}</span>
      </div>
      <button className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-bold text-white" onClick={onOpen} type="button">{t(`verification.notice.${key}.action`)}</button>
    </article>
  )
}

function ProviderVerificationDialog({
  open,
  onClose,
  role,
  verification,
  onChange,
}: {
  open: boolean
  onClose: () => void
  role: 'doctor' | 'laboratory'
  verification: ProviderVerificationPayload
  onChange: (payload: ProviderVerificationPayload) => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => dialogRef.current?.querySelector('h2')?.focus())
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous }
  }, [busy, onClose, open])

  if (!open) return null

  async function onFile(type: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > maxBytes || (!allowedTypes.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(file.name.split('.').pop()?.toLowerCase() ?? ''))) {
      setError(t('verification.invalidFile'))
      return
    }
    setBusy(type); setError('')
    try { onChange(await uploadVerificationDocument(role, type, file)) }
    catch (caught) { setError(caught instanceof ApiError && caught.status === 422 ? t('verification.invalidFile') : t('verification.uploadError')) }
    finally { setBusy('') }
  }

  async function submit() {
    setBusy('submit'); setError('')
    try { onChange(await submitProviderVerification(role)); onClose() }
    catch { setError(t('verification.submitError')) }
    finally { setBusy('') }
  }

  async function view(id: number) {
    try {
      const { blob, filename } = await downloadVerificationDocument(role, id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch { setError(t('verification.viewError')) }
  }

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div aria-labelledby={titleId} aria-modal="true" className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8" ref={dialogRef} role="dialog">
        <h2 className="text-2xl font-extrabold outline-none" id={titleId} tabIndex={-1}>{t('verification.workflowTitle')}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{t('verification.workflowHelp')}</p>
        <p className="mt-4 text-sm font-semibold">{t('verification.progress', { submitted: verification.submitted_count, required: verification.required_count })}</p>
        <ul className="mt-5 space-y-3">
          {verification.requirements.map((item) => {
            const current = item.current
            const rejected = current?.status === 'rejected'
            return (
              <li className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4" key={item.document_type}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold">{t(`verification.types.${item.document_type}`)}</p>
                    <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{current ? current.original_filename : t('verification.required')}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${current ? verificationBadgeClass(rejected ? 'action_required' : current.status === 'approved' ? 'verified' : 'under_review') : 'border-teal-200 bg-white text-teal-900'}`}>{current ? t(`verification.documentStatuses.${current.status}`) : t('verification.required')}</span>
                </div>
                {rejected && current.admin_note && <p className="mt-3 break-words rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{current.admin_note}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {current && <button className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-bold" onClick={() => view(current.id)} type="button">{t('verification.view')}</button>}
                  {verification.can_upload && (
                    <label className="cursor-pointer rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white">
                      {busy === item.document_type ? t('verification.uploading') : current ? t('verification.replace') : t('verification.upload')}
                      <input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={Boolean(busy)} onChange={(event) => onFile(item.document_type, event)} type="file" />
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-12 rounded-full border border-[var(--color-border)] px-6 font-bold" disabled={Boolean(busy)} onClick={onClose} type="button">{t('verification.close')}</button>
          {verification.can_submit && <button className="min-h-12 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={submit} type="button">{busy === 'submit' ? t('verification.submitting') : t(verification.status === 'action_required' ? 'verification.resubmit' : 'verification.submit')}</button>}
        </div>
      </div>
    </div>
  )
}
