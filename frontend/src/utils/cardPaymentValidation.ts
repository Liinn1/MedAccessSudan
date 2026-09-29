/** Client-only card checks. Valid input does not mean a payment occurred. */

export interface CardPaymentFields {
  name: string
  number: string
  expiry: string
  cvv: string
}

export function emptyCardFields(): CardPaymentFields {
  return { name: '', number: '', expiry: '', cvv: '' }
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCardNumber(value: string): string {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`
}

export function passesLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let doubleDigit = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }
  return sum % 10 === 0
}

export function expiryIsValid(value: string): boolean {
  const match = digitsOnly(value).match(/^(\d{2})(\d{2})$/)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return end >= new Date()
}

export type CardFieldError = Partial<Record<keyof CardPaymentFields, string>>

export function validateCardFields(card: CardPaymentFields, t: (key: string) => string): CardFieldError {
  const errors: CardFieldError = {}
  const name = card.name.trim()
  if (name.length < 3) errors.name = t('patient.payment.errors.name')
  const number = digitsOnly(card.number)
  if (!passesLuhn(number)) errors.number = t('patient.payment.errors.number')
  const expiryDigits = digitsOnly(card.expiry)
  if (!/^\d{4}$/.test(expiryDigits) || Number(expiryDigits.slice(0, 2)) < 1 || Number(expiryDigits.slice(0, 2)) > 12) {
    errors.expiry = t('patient.payment.errors.expiry')
  } else if (!expiryIsValid(card.expiry)) {
    errors.expiry = t('patient.payment.errors.expired')
  }
  if (!/^\d{3,4}$/.test(digitsOnly(card.cvv))) errors.cvv = t('patient.payment.errors.cvv')
  return errors
}
