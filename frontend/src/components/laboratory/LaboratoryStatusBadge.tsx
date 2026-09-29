import { useTranslation } from 'react-i18next'
import { laboratoryStatusClass, type LaboratoryOrderStatus } from '../../services/laboratoryService'

export function LaboratoryStatusBadge({ status, namespace = 'laboratory.statuses' }: { status: LaboratoryOrderStatus; namespace?: string }) {
  const { t } = useTranslation()
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${laboratoryStatusClass(status)}`}>{t(`${namespace}.${status}`)}</span>
}
