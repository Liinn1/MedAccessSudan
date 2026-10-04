import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFilter, AdminFilters, AdminRecordCard, AdminRecordList, AdminSearch } from '../../../components/admin/AdminManagementList'
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { ApiError } from '../../../services/apiClient'
import { getAdminInquiries, getAdminInquiry, replyToInquiry, updateInquiryStatus, type CustomerInquirySummary } from '../../../services/adminService'
import { ActionButton } from '../../../components/buttons/ActionButton'
import { SUDAN_TIME_ZONE } from '../../../utils/dateTime'

export function AdminInquiriesSection({ openId }: { openId?: number | null }) {
  const { i18n, t } = useTranslation()
  const [items, setItems] = useState<CustomerInquirySummary[]>([])
  const [status, setStatus] = useState('new')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<CustomerInquirySummary | null>(null)

  async function load(signal?: AbortSignal) {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (query.trim()) params.set('q', query.trim())
      const suffix = params.toString() ? `?${params}` : ''
      setItems(await getAdminInquiries(suffix, signal))
    } catch { if (!signal?.aborted) setError(t('admin.errors.load')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void load(controller.signal) }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [status, query])

  useEffect(() => {
    if (!openId) return
    getAdminInquiry(openId).then(setDetail).catch(() => undefined)
  }, [openId])

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'

  return (
    <DashboardPage>
      <AdminPageHeader description={t('admin.inquiries.description')} eyebrow={t('admin.workspace')} title={t('admin.navigation.inquiries')} />
      {error && <div className="mt-4"><ErrorState contained message={error} onRetry={() => void load()} retryLabel={t('admin.retry')} /></div>}
      <AdminFilters>
        <AdminFilter label={t('admin.table.status')} onChange={setStatus} value={status}>
          <option value="">{t('admin.filters.all')}</option>
          <option value="new">{t('admin.inquiries.statuses.new')}</option>
          <option value="in_progress">{t('admin.inquiries.statuses.in_progress')}</option>
          <option value="resolved">{t('admin.inquiries.statuses.resolved')}</option>
        </AdminFilter>
        <AdminSearch label={t('admin.inquiries.search')} onChange={setQuery} value={query} />
      </AdminFilters>
      <AdminRecordList emptyDescription={t('admin.inquiries.emptyDescription')} emptyTitle={t('admin.inquiries.empty')} loading={loading}>
        {items.map((item) => (
          <AdminRecordCard
            action={<ActionButton onClick={() => { void getAdminInquiry(item.id).then(setDetail) }} size="sm" variant="secondary">{t('admin.actions.respond')}</ActionButton>}
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{item.subject}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.name} · {item.email}</p>
                <p className="mt-2 text-sm">{item.preview}</p>
              </div>
              <AdminStatusBadge label={t(`admin.inquiries.statuses.${item.status}`)} status={item.status} />
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{item.created_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(item.created_at)) : ''}</p>
          </AdminRecordCard>
        ))}
      </AdminRecordList>
      {detail && <InquiryDetail inquiry={detail} onClose={() => setDetail(null)} onUpdated={(next) => { setDetail(next); void load() }} />}
    </DashboardPage>
  )
}

function InquiryDetail({ inquiry, onClose, onUpdated }: { inquiry: CustomerInquirySummary; onClose: () => void; onUpdated: (inquiry: CustomerInquirySummary) => void }) {
  const { i18n, t } = useTranslation()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'

  async function run(key: string, action: () => Promise<CustomerInquirySummary>) {
    setBusy(key); setError('')
    try { onUpdated(await action()); setBody('') }
    catch (caught) { setError(caught instanceof ApiError && caught.status === 422 ? t('admin.errors.validation') : t('admin.errors.action')) }
    finally { setBusy('') }
  }

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-white p-6">
        <AdminStatusBadge label={t(`admin.inquiries.statuses.${inquiry.status}`)} status={inquiry.status} />
        <h2 className="mt-4 text-2xl font-extrabold">{inquiry.subject}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{inquiry.name} · {inquiry.email}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{inquiry.created_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(inquiry.created_at)) : ''}</p>
        <div className="mt-6 space-y-3">
          {(inquiry.messages ?? []).map((message) => (
            <article className="rounded-2xl border border-[var(--color-border)] p-4" key={message.id}>
              <p className="text-sm font-bold">{message.author_type === 'admin' ? t('admin.inquiries.admin') : inquiry.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{message.created_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: SUDAN_TIME_ZONE }).format(new Date(message.created_at)) : ''}</p>
              <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
            </article>
          ))}
        </div>
        <form className="mt-6" onSubmit={(event: FormEvent) => { event.preventDefault(); void run('reply', () => replyToInquiry(inquiry.id, body.trim())) }}>
          <label className="block font-bold">{t('admin.inquiries.reply')}
            <textarea className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3" onChange={(event) => setBody(event.target.value)} required value={body} />
          </label>
          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <ActionButton disabled={Boolean(busy)} onClick={onClose} variant="tertiary">{t('admin.actions.cancel')}</ActionButton>
            <ActionButton disabled={Boolean(busy)} onClick={() => void run('progress', () => updateInquiryStatus(inquiry.id, 'in_progress'))} variant="secondary">{t('admin.inquiries.markProgress')}</ActionButton>
            <ActionButton disabled={Boolean(busy)} onClick={() => void run('resolved', () => updateInquiryStatus(inquiry.id, 'resolved'))} variant="secondary">{t('admin.inquiries.markResolved')}</ActionButton>
            <ActionButton disabled={Boolean(busy) || body.trim().length < 2} type="submit" variant="primary">{busy === 'reply' ? t('admin.actions.working') : t('admin.inquiries.send')}</ActionButton>
          </div>
        </form>
      </div>
    </div>
  )
}
