import type { ServicePayment } from '../services/paymentTypes'

export function paymentMethodLabel(payment: ServicePayment | null | undefined, t: (key: string) => string): string | null {
  if (!payment) return null
  return t(`patient.payment.methods.${payment.method}`)
}
