import { useTranslation } from 'react-i18next'
import customerCareImage from '../../../assets/public-home/customer-care.jpg'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { DashboardEmptyState } from '../../../components/dashboard/DashboardEmptyState'
import { DashboardFeatureCarousel } from '../../../components/dashboard/DashboardFeatureCarousel'
import { DashboardGreeting } from '../../../components/dashboard/DashboardGreeting'
import { DashboardHomeCard, DashboardHomeGrid } from '../../../components/dashboard/DashboardHomeCard'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { DashboardSplit } from '../../../components/dashboard/DashboardSectionCard'
import { DashboardStatCard, DashboardStatsGrid } from '../../../components/dashboard/DashboardStatCard'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { LaboratoryIcon, MailIcon, StethoscopeIcon } from '../../../components/icons/PatientHomeIcons'
import type { AdminAttentionItem, AdminDashboardPayload } from '../../../services/adminService'
import { greetingPeriod, SUDAN_TIME_ZONE } from '../../../utils/dateTime'
import { ActionButton } from '../../../components/buttons/ActionButton'
import type { AdminSectionKey } from '../../../layouts/AdminLayout'

export function AdminOverviewSection({
  data,
  loading,
  name,
  onOpenAttention,
  onNavigate,
}: {
  data: AdminDashboardPayload | null
  loading: boolean
  name: string
  onOpenAttention: (item: AdminAttentionItem) => void
  onNavigate: (section: AdminSectionKey, extra?: { requestTab?: 'locations' | 'tests' }) => void
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const queues = data?.queues ?? { verifications: [], inquiries: [], tests: [] }
  const requestItems = [...queues.tests].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

  return (
    <DashboardPage>
      <DashboardGreeting
        greeting={t(`admin.greetings.${greetingPeriod()}`, { name })}
        description={t('admin.supportingText')}
      />
      {loading || !data ? <LoadingState contained message={t('admin.loading')} /> : (
        <>
          <DashboardStatsGrid label={t('admin.overviewLabel')}>
            <DashboardStatCard actionLabel={t('admin.actions.review')} hint={t('admin.metrics.verificationsHint')} icon={StethoscopeIcon} label={t('admin.metrics.verifications_awaiting_review')} onSelect={() => onNavigate('verification')} tone="pending" value={data.metrics.verifications_awaiting_review} />
            <DashboardStatCard actionLabel={t('admin.actions.respond')} hint={t('admin.metrics.inquiriesHint')} icon={MailIcon} label={t('admin.metrics.inquiries_new')} onSelect={() => onNavigate('inquiries')} tone="info" value={data.metrics.inquiries_new} />
            <DashboardStatCard actionLabel={t('admin.actions.review')} hint={t('admin.metrics.testsHint')} icon={LaboratoryIcon} label={t('admin.metrics.test_requests_pending')} onSelect={() => onNavigate('requests', { requestTab: 'tests' })} tone="pending" value={data.metrics.test_requests_pending} />
          </DashboardStatsGrid>

          <DashboardSplit>
            <QueueCard
              actionLabel={t('patient.dashboard.viewAll')}
              emptyDescription={t('admin.verification.emptyDescription')}
              emptyTitle={t('admin.verification.empty')}
              items={queues.verifications}
              locale={locale}
              onOpen={onOpenAttention}
              onViewAll={() => onNavigate('verification')}
              renderMeta={(item) => item.provider_type ? t(`roles.${item.provider_type}`) : ''}
              statusKey={(item) => item.status ? `verification.statuses.${item.status}` : ''}
              title={t('admin.navigation.verification')}
            />
            <DashboardFeatureCarousel
              carouselDescription={t('admin.feature.carousel')}
              carouselLabel={t('admin.feature.carouselLabel')}
              isRtl={i18n.dir() === 'rtl'}
              nextLabel={t('admin.feature.next')}
              paginationLabel={t('admin.feature.pagination')}
              previousLabel={t('admin.feature.previous')}
              slideLabel={(number) => t('admin.feature.goToSlide', { number })}
              slides={[{
                id: 'verification', image: customerCareImage, imagePosition: 'object-center',
                label: t('admin.feature.slides.verification.label'),
                title: t('admin.feature.slides.verification.title'),
                description: t('admin.feature.slides.verification.description'),
                cta: t('admin.feature.slides.verification.cta'),
                onSelect: () => onNavigate('verification'),
              }]}
              title={t('admin.feature.title')}
            />
          </DashboardSplit>

          <DashboardHomeGrid>
            <QueueCard
              actionLabel={t('patient.dashboard.viewAll')}
              emptyDescription={t('admin.inquiries.emptyDescription')}
              emptyTitle={t('admin.inquiries.empty')}
              items={queues.inquiries}
              locale={locale}
              onOpen={onOpenAttention}
              onViewAll={() => onNavigate('inquiries')}
              renderMeta={(item) => item.sender ?? ''}
              statusKey={(item) => item.status ? `admin.inquiries.statuses.${item.status}` : ''}
              title={t('admin.navigation.inquiries')}
            />
            <QueueCard
              actionLabel={t('patient.dashboard.viewAll')}
              emptyDescription={t('admin.requests.emptyDescription')}
              emptyTitle={t('admin.requests.empty')}
              items={requestItems}
              locale={locale}
              onOpen={onOpenAttention}
              onViewAll={() => onNavigate('requests', { requestTab: 'tests' })}
              renderMeta={(item) => t(`admin.attention.kinds.${item.kind}`)}
              statusKey={() => 'admin.statuses.pending'}
              title={t('admin.navigation.requests')}
            />
            <DashboardHomeCard title={t('admin.insights.title')}>
              <ul className="space-y-3">
                <InsightRow label={t('admin.metrics.registered_patients')} value={data.metrics.registered_patients} />
                <InsightRow label={t('admin.metrics.verified_doctors')} value={data.metrics.verified_doctors} />
                <InsightRow label={t('admin.metrics.verified_laboratories')} value={data.metrics.verified_laboratories ?? 0} />
                <InsightRow label={t('admin.metrics.users_total')} value={data.metrics.users_total} />
              </ul>
            </DashboardHomeCard>
          </DashboardHomeGrid>
        </>
      )}
    </DashboardPage>
  )
}

function InsightRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <span className="direction-ltr font-black tabular-nums">{value}</span>
    </li>
  )
}

function QueueCard({
  title,
  items,
  emptyTitle,
  emptyDescription,
  locale,
  onOpen,
  onViewAll,
  actionLabel,
  renderMeta,
  statusKey,
}: {
  title: string
  items: AdminAttentionItem[]
  emptyTitle: string
  emptyDescription: string
  locale: string
  onOpen: (item: AdminAttentionItem) => void
  onViewAll: () => void
  actionLabel: string
  renderMeta: (item: AdminAttentionItem) => string
  statusKey: (item: AdminAttentionItem) => string
}) {
  const { t } = useTranslation()
  return (
    <DashboardHomeCard action={<ActionButton onClick={onViewAll} size="sm" variant="tertiary">{actionLabel}</ActionButton>} title={title}>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = statusKey(item)
            return (
              <li className="rounded-2xl border border-[var(--color-border)] p-4" key={item.key}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-extrabold">{item.subtitle}</p>
                  {status ? <AdminStatusBadge label={t(status)} status={item.status ?? 'pending'} /> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{renderMeta(item)}{item.at ? ` · ${formatWhen(item.at, locale)}` : ''}</p>
                <div className="mt-3">
                  <ActionButton onClick={() => onOpen(item)} size="sm" variant="secondary">{item.kind === 'inquiry' ? t('admin.actions.respond') : t('admin.actions.review')}</ActionButton>
                </div>
              </li>
            )
          })}
        </ul>
      ) : <DashboardEmptyState description={emptyDescription} title={emptyTitle} />}
    </DashboardHomeCard>
  )
}

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(iso))
}
