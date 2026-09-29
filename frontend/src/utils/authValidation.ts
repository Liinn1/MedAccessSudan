/** Client checks that mirror Laravel RegisterPatient/RegisterDoctor rules. */

export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES = 3072 * 1024

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-()]/g, '').trim()
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(value))
}

/** Matches Password::min(8)->letters()->numbers() used by Laravel registration. */
export function isValidRegistrationPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value)
}

export function profilePhotoIssue(file: File | null, required: boolean): 'required' | 'invalid' | '' {
  if (!file) return required ? 'required' : ''
  if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) return 'invalid'
  return ''
}

export function laravelFieldErrors(details: unknown): Record<string, string> {
  if (typeof details !== 'object' || details === null || !('errors' in details)) return {}
  const raw = (details as { errors: unknown }).errors
  if (typeof raw !== 'object' || raw === null) return {}

  const mapped: Record<string, string> = {}
  for (const [field, messages] of Object.entries(raw)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string' && messages[0]) {
      mapped[field] = messages[0]
    } else if (typeof messages === 'string' && messages) {
      mapped[field] = messages
    }
  }
  return mapped
}
