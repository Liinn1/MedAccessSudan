export type ServicePaymentMethod = 'card' | 'pay_later'
export type ServicePaymentStatus = 'unpaid' | 'pending'

export interface ServicePayment {
  method: ServicePaymentMethod
  status: ServicePaymentStatus
  amount: string | null
  currency: string | null
}
