import { useId, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../services/apiClient'
import {
  downloadVerificationDocument,
  submitProviderVerification,
  uploadVerificationDocument,
  canonicalVerificationStatus,
  verificationBadgeClass,
  type ProviderVerificationPayload,
} from '../../services/providerVerificationService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

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
  const { i18n, t } = useTranslation()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  if (!verification) return null
  const status = canonicalVerificationStatus(verification.status)
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(value))
    : null

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
    try { onChange(await submitProviderVerification(role)) }
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
    <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8" id="account-verification">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">{status === 'verified' ? t('verification.verifiedTitle') : t('verification.title')}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{t('verification.statusLabel')}: {t(`verification.statuses.${status}`)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(status)}`}>{t(`verification.statuses.${status}`)}</span>
      </div>
      <p className="mt-3 break-words text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`verification.summaries.${status}`)}</p>
      {status === 'under_review' && verification.submitted_at && <p className="mt-3 text-sm font-semibold">{t('verification.submittedOn')}: {formatDate(verification.submitted_at)}</p>}
      {status === 'verified' && verification.reviewed_at && <p className="mt-3 text-sm font-semibold">{t('verification.verifiedOn')}: {formatDate(verification.reviewed_at)}</p>}
      {status === 'pending_documents' && <p className="mt-3 text-sm font-semibold">{t('verification.progress', { submitted: verification.submitted_count, required: verification.required_count })}</p>}
      {status === 'action_required' && verification.admin_note && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">{t('verification.reason')}</p>
          <p className="mt-1 break-words text-sm text-amber-900">{verification.admin_note}</p>
        </div>
      )}
      {status !== 'verified' && (
        <ul className="mt-6 space-y-3">
          {verification.requirements.map((item) => {
            const current = item.current
            const rejected = current?.status === 'rejected'
            const approved = current?.status === 'approved'
            const canReplace = verification.can_upload && (
              status === 'action_required' ? rejected : !approved
            )
            return (
              <li className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4" key={item.document_type}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold">{t(`verification.types.${item.document_type}`)}</p>
                    <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{current ? current.original_filename : t('verification.notUploaded')}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${current ? verificationBadgeClass(rejected ? 'action_required' : current.status === 'approved' ? 'verified' : 'under_review') : 'border-teal-200 bg-white text-teal-900'}`}>{current ? t(`verification.documentStatuses.${current.status}`) : t('verification.notUploaded')}</span>
                </div>
                {rejected && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-bold">{t('verification.replacementRequested')}</p>
                    {current.admin_note && <p className="mt-1 break-words">{t('verification.reason')}: {current.admin_note}</p>}
                  </div>
                )}
                {current?.status === 'pending' && status === 'action_required' && (
                  <p className="mt-3 text-sm font-semibold text-[var(--color-primary)]">{t('verification.replacementReady')}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {current && <button className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-bold" onClick={() => view(current.id)} type="button">{t('verification.view')}</button>}
                  {canReplace && (
                    <label className="cursor-pointer rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white">
                      {busy === item.document_type ? t('verification.uploading') : current ? t('verification.replaceDocument') : t('verification.upload')}
                      <input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={Boolean(busy)} onChange={(event) => onFile(item.document_type, event)} type="file" />
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {verification.can_submit && (
        <button className="mt-6 min-h-12 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={submit} type="button">
          {busy === 'submit' ? t('verification.submitting') : t(status === 'action_required' ? 'verification.resubmit' : 'verification.submit')}
        </button>
      )}
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
  const titleId = useId()
  const normalized = canonicalVerificationStatus(status)
  if (normalized === 'verified') return null
  const key = normalized === 'under_review' ? 'underReview' : normalized === 'action_required' ? 'actionRequired' : 'required'

  return (
    <article aria-labelledby={titleId} className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold" id={titleId}>{t(`verification.notice.${key}.title`)}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t(`verification.notice.${key}.body`)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verificationBadgeClass(normalized)}`}>{t(`verification.statuses.${normalized}`)}</span>
      </div>
      <button className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-bold text-white" onClick={onOpen} type="button">{t(`verification.notice.${key}.action`)}</button>
    </article>
  )
}
