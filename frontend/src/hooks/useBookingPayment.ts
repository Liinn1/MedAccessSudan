import { useState } from 'react'
import { emptyCardFields, validateCardFields, type CardPaymentFields } from '../utils/cardPaymentValidation'

export type BookingPaymentMethod = 'card' | 'pay_later'

export function useBookingPayment() {
  const [method, setMethod] = useState<BookingPaymentMethod | ''>('')
  const [card, setCard] = useState<CardPaymentFields>(emptyCardFields)
  const [errors, setErrors] = useState<{ method?: string } & Partial<Record<keyof CardPaymentFields, string>>>({})

  function validate(t: (key: string) => string): boolean {
    if (!method) {
      setErrors({ method: t('patient.payment.errors.methodRequired') })
      return false
    }
    if (method === 'pay_later') {
      setErrors({})
      return true
    }
    const cardErrors = validateCardFields(card, t)
    setErrors(cardErrors)
    return Object.keys(cardErrors).length === 0
  }

  function payload(): { payment_method: BookingPaymentMethod } {
    if (method !== 'card' && method !== 'pay_later') throw new Error('Payment method is required')
    return { payment_method: method }
  }

  return { method, setMethod, card, setCard, errors, validate, payload }
}
