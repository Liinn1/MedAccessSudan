import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFilter, AdminFilters, AdminRecordCard, AdminRecordList } from '../../../components/admin/AdminManagementList'
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { AdminVerificationReviewDialog } from '../../../components/admin/AdminVerificationReviewDialog'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { getAdminVerifications, type ProviderVerificationListItem } from '../../../services/providerVerificationService'
import { ActionButton } from '../../../components/buttons/ActionButton'
import { SUDAN_TIME_ZONE } from '../../../utils/dateTime'

export function AdminVerificationSection({ openId }: { openId?: number | null }) {
  const { i18n, t } = useTranslation()
  const [items, setItems] = useState<ProviderVerificationListItem[]>([])
  const [providerType, setProviderType] = useState('')
  const [status, setStatus] = useState('under_review')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [review, setReview] = useState<ProviderVerificationListItem | null>(null)

  async function load(signal?: AbortSignal) {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (providerType) params.set('provider_type', providerType)
      if (status) params.set('status', status)
      setItems(await getAdminVerifications(`?${params}`, signal))
    } catch { if (!signal?.aborted) setError(t('admin.errors.load')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [providerType, status])

  useEffect(() => {
    if (!openId || !items.length) return
    const match = items.find((item) => item.id === openId)
    if (match) setReview(match)
  }, [openId, items])

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'

  return (
    <DashboardPage>
      <AdminPageHeader description={t('admin.verification.description')} eyebrow={t('admin.workspace')} title={t('admin.navigation.verification')} />
      {error && <div className="mt-4"><ErrorState contained message={error} onRetry={() => void load()} retryLabel={t('admin.retry')} /></div>}
      <AdminFilters>
        <AdminFilter label={t('admin.verification.providerType')} onChange={setProviderType} value={providerType}>
          <option value="">{t('admin.filters.all')}</option>
          <option value="doctor">{t('roles.doctor')}</option>
          <option value="laboratory">{t('roles.laboratory')}</option>
        </AdminFilter>
        <AdminFilter label={t('admin.table.status')} onChange={setStatus} value={status}>
          <option value="">{t('admin.filters.all')}</option>
          <option value="under_review">{t('verification.statuses.under_review')}</option>
          <option value="verified">{t('verification.statuses.verified')}</option>
          <option value="action_required">{t('verification.statuses.action_required')}</option>
        </AdminFilter>
      </AdminFilters>
      <AdminRecordList emptyDescription={t('admin.verification.emptyDescription')} emptyTitle={t('admin.verification.empty')} loading={loading}>
        {items.map((item) => (
          <AdminRecordCard
            action={<ActionButton onClick={() => setReview(item)} size="sm" variant="secondary">{t('admin.actions.review')}</ActionButton>}
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{item.provider_name}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t(`roles.${item.provider_type}`)} · {t('verification.progress', { submitted: item.submitted_count, required: item.required_count })}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.submitted_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(item.submitted_at)) : '—'}</p>
              </div>
              <AdminStatusBadge label={t(`verification.statuses.${item.status}`)} status={item.status} />
            </div>
          </AdminRecordCard>
        ))}
      </AdminRecordList>
      <AdminVerificationReviewDialog item={review} onClose={() => setReview(null)} onUpdated={() => load()} open={Boolean(review)} />
    </DashboardPage>
  )
}
