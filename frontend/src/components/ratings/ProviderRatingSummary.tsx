import { useTranslation } from 'react-i18next'
import type { ProviderRatingSummary as Summary } from '../../services/providerReviewService'

export function ProviderRatingSummary({ className = '', rating }: { className?: string; rating: Partial<Summary> }) {
  const { t } = useTranslation()
  const count = rating.review_count ?? 0

  if (count < 1) return <p className={`text-sm font-semibold text-[var(--color-text-secondary)] ${className}`}>{t('ratings.noRatings')}</p>

  const average = (rating.average_rating ?? 0).toFixed(1)
  return (
    <p aria-label={t('ratings.summaryLabel', { average, count })} className={`text-sm font-bold text-amber-600 ${className}`}>
      <span aria-hidden="true">★</span> {average}{' '}
      <span className="font-normal text-[var(--color-text-secondary)]">({t('ratings.reviewCount', { count })})</span>
    </p>
  )
}
