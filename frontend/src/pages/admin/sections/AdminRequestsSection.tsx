import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFilter, AdminFilters, AdminRecordCard, AdminRecordList } from '../../../components/admin/AdminManagementList'
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { ApiError } from '../../../services/apiClient'
import {
  getCatalogMatches,
  getCatalogRequests,
  reviewCatalogRequest,
  type CatalogRequestItem,
} from '../../../services/adminService'
import { ActionButton } from '../../../components/buttons/ActionButton'
import { SUDAN_TIME_ZONE } from '../../../utils/dateTime'

export function AdminRequestsSection({
  openTestId,
}: {
  tab: 'locations' | 'tests'
  onTabChange: (tab: 'locations' | 'tests') => void
  openLocationId?: number | null
  openTestId?: number | null
}) {
  const { t } = useTranslation()

  return (
    <DashboardPage>
      <AdminPageHeader description={t('admin.requests.description')} eyebrow={t('admin.workspace')} title={t('admin.navigation.requests')} />
      <TestRequests onChanged={() => {}} openId={openTestId} />
    </DashboardPage>
  )
}

function TestRequests({ openId, onChanged }: { openId?: number | null; onChanged: () => void }) {
  const { i18n, t } = useTranslation()
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState<CatalogRequestItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: number; slug: string; name_en: string; name_ar: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [review, setReview] = useState<CatalogRequestItem | null>(null)

  async function load(signal?: AbortSignal) {
    setLoading(true); setError('')
    try {
      const data = await getCatalogRequests(status, signal)
      setItems(data.requests)
      setCategories(data.categories)
    } catch { if (!signal?.aborted) setError(t('admin.errors.load')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }
  const loadEffect = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void loadEffect(controller.signal) }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [status])

  useEffect(() => {
    if (!openId) return
    const match = items.find((item) => item.id === openId)
    if (match) window.setTimeout(() => setReview(match), 0)
  }, [openId, items])

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const localized = (item: { name_en: string; name_ar: string }) => i18n.language.startsWith('ar') ? item.name_ar : item.name_en

  return (
    <>
      {error && <div className="mt-4"><ErrorState contained message={error} onRetry={() => void load()} retryLabel={t('admin.retry')} /></div>}
      <AdminFilters>
        <AdminFilter label={t('admin.table.status')} onChange={setStatus} value={status}>
          <option value="pending">{t('admin.statuses.pending')}</option>
          <option value="approved">{t('admin.statuses.approved')}</option>
          <option value="rejected">{t('admin.statuses.rejected')}</option>
          <option value="all">{t('admin.filters.all')}</option>
        </AdminFilter>
      </AdminFilters>
      <AdminRecordList emptyDescription={t(`admin.requests.emptyStates.tests.${status}.description`)} emptyTitle={t(`admin.requests.emptyStates.tests.${status}.title`)} loading={loading}>
        {items.map((item) => (
          <AdminRecordCard
            action={item.status === 'pending' ? <ActionButton onClick={() => setReview(item)} size="sm" variant="secondary">{t('admin.actions.review')}</ActionButton> : undefined}
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{item.suggested_name}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.laboratory.name} · {item.suggested_category ? localized(item.suggested_category) : t('admin.tests.noCategory')}</p>
                {item.created_at && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(item.created_at))}</p>}
              </div>
              <AdminStatusBadge label={t(`admin.statuses.${item.status}`)} status={item.status} />
            </div>
          </AdminRecordCard>
        ))}
      </AdminRecordList>
      {review && <CatalogReview item={review} categories={categories} onClose={() => setReview(null)} onUpdated={() => { setReview(null); void load(); onChanged() }} />}
    </>
  )
}

function CatalogReview({ item, categories, onClose, onUpdated }: { item: CatalogRequestItem; categories: Array<{ id: number; slug: string; name_en: string; name_ar: string }>; onClose: () => void; onUpdated: () => void }) {
  const { i18n, t } = useTranslation()
  const [nameEn, setNameEn] = useState(item.suggested_name)
  const [nameAr, setNameAr] = useState('')
  const [shortName, setShortName] = useState('')
  const [categoryId, setCategoryId] = useState(String(item.suggested_category?.id ?? ''))
  const [mapId, setMapId] = useState('')
  const [note, setNote] = useState('')
  const [matches, setMatches] = useState<Array<{ id: number; name_en: string; name_ar: string; short_name: string | null }>>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const localized = (row: { name_en: string; name_ar: string }) => i18n.language.startsWith('ar') ? row.name_ar : row.name_en

  useEffect(() => {
    getCatalogMatches(nameEn).then(setMatches).catch(() => setMatches([]))
  }, [nameEn])

  async function run(action: 'approve' | 'map' | 'reject') {
    setBusy(action); setError('')
    try {
      await reviewCatalogRequest(item.id, {
        action,
        name_en: nameEn,
        name_ar: nameAr || undefined,
        short_name: shortName || undefined,
        lab_test_category_id: categoryId ? Number(categoryId) : undefined,
        lab_test_id: mapId ? Number(mapId) : undefined,
        admin_note: note || undefined,
      })
      onUpdated()
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 422 ? t('admin.tests.duplicate') : t('admin.errors.action'))
    } finally { setBusy('') }
  }

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-extrabold">{t('admin.tests.review')}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{item.laboratory.name} · {item.suggested_name}</p>
        {item.note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{item.note}</p>}
        <label className="mt-5 block font-bold">{t('admin.tests.nameEn')}<input className="mt-2 w-full rounded-xl border px-3 py-2" onChange={(event) => setNameEn(event.target.value)} value={nameEn} /></label>
        <label className="mt-4 block font-bold">{t('admin.tests.nameAr')}<input className="mt-2 w-full rounded-xl border px-3 py-2" onChange={(event) => setNameAr(event.target.value)} value={nameAr} /></label>
        <label className="mt-4 block font-bold">{t('admin.tests.shortName')}<input className="mt-2 w-full rounded-xl border px-3 py-2" onChange={(event) => setShortName(event.target.value)} value={shortName} /></label>
        <label className="mt-4 block font-bold">{t('admin.tests.category')}
          <select className="mt-2 w-full rounded-xl border px-3 py-2" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">{t('admin.tests.noCategory')}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{localized(category)}</option>)}
          </select>
        </label>
        {matches.length > 0 && (
          <label className="mt-4 block font-bold">{t('admin.tests.mapExisting')}
            <select className="mt-2 w-full rounded-xl border px-3 py-2" onChange={(event) => setMapId(event.target.value)} value={mapId}>
              <option value="">{t('admin.tests.chooseExisting')}</option>
              {matches.map((match) => <option key={match.id} value={match.id}>{localized(match)}{match.short_name ? ` (${match.short_name})` : ''}</option>)}
            </select>
          </label>
        )}
        <label className="mt-4 block font-bold">{t('admin.tests.note')}<textarea className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2" onChange={(event) => setNote(event.target.value)} value={note} /></label>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ActionButton disabled={Boolean(busy)} onClick={onClose} variant="tertiary">{t('admin.actions.cancel')}</ActionButton>
          <ActionButton disabled={Boolean(busy) || note.trim() === ''} onClick={() => void run('reject')} variant="danger">{t('admin.actions.reject')}</ActionButton>
          <ActionButton disabled={Boolean(busy) || !mapId} onClick={() => void run('map')} variant="secondary">{t('admin.tests.useExisting')}</ActionButton>
          <ActionButton disabled={Boolean(busy) || !nameEn.trim() || !categoryId} onClick={() => void run('approve')} variant="primary">{busy === 'approve' ? t('admin.actions.working') : t('admin.actions.approveNew')}</ActionButton>
        </div>
      </div>
    </div>
  )
}
