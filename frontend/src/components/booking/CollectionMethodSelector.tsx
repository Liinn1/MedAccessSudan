import { useTranslation } from 'react-i18next'
import type { LaboratoryCollectionMethod } from '../../services/laboratoryService'

const methods: LaboratoryCollectionMethod[] = ['at_lab', 'home_collection']

export function CollectionMethodSelector({
  value,
  onChange,
}: {
  value: LaboratoryCollectionMethod
  onChange: (value: LaboratoryCollectionMethod) => void
}) {
  const { t } = useTranslation()

  return (
    <fieldset className="mb-5">
      <legend className="text-sm font-extrabold">{t('patient.laboratory.collectionMethodTitle')}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {methods.map((method) => {
          const selected = value === method
          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 rounded-2xl border px-4 py-3 text-start text-sm font-bold ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'}`}
              key={method}
              onClick={() => onChange(method)}
              type="button"
            >
              {t(`patient.laboratory.collectionMethods.${method}`)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
