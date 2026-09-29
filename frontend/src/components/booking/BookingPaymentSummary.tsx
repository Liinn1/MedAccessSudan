import { useTranslation } from 'react-i18next'
import type { ServicePayment } from '../../services/paymentTypes'

export function paymentMethodLabel(payment: ServicePayment | null | undefined, t: (key: string) => string): string | null {
  if (!payment) return null
  return t(`patient.payment.methods.${payment.method}`)
}

export function BookingPaymentSummary({ payment }: { payment?: ServicePayment | null }) {
  const { t } = useTranslation()
  if (!payment) return null
  const dueAtService = payment.method === 'pay_later'
  return (
    <dl className="mt-5 rounded-2xl bg-slate-50 p-4 text-start">
      <div className="grid gap-1 sm:grid-cols-[12rem_1fr]">
        <dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.payment.title')}</dt>
        <dd className="font-semibold">{t(`patient.payment.methods.${payment.method}`)}</dd>
      </div>
      <div className="mt-3 grid gap-1 sm:grid-cols-[12rem_1fr]">
        <dt className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.payment.statusLabel')}</dt>
        <dd className="font-semibold">{t(dueAtService ? 'patient.payment.dueAtService' : 'patient.payment.cardPending')}</dd>
      </div>
    </dl>
  )
}
