import { useTranslation } from 'react-i18next'
import type { LaboratoryCollectionMethod } from '../../services/laboratoryService'

export function CollectionMethodBadge({ method = 'at_lab' }: { method?: LaboratoryCollectionMethod | null }) {
  const { t } = useTranslation()
  const value = method ?? 'at_lab'
  const home = value === 'home_collection'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${home ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-teal-200 bg-[var(--color-primary-surface)] text-teal-900'}`}>
      {t(`laboratory.collectionBadges.${value}`)}
    </span>
  )
}
