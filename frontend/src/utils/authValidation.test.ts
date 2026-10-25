import { describe, expect, it } from 'vitest'
import { hasLaravelValidationCode } from './authValidation'

describe('Laravel validation code mapping', () => {
  it('distinguishes duplicate email from invalid email without parsing messages', () => {
    const duplicate = { validation_codes: { email: ['unique'] } }
    const invalid = { validation_codes: { email: ['email'] } }

    expect(hasLaravelValidationCode(duplicate, 'email', 'unique')).toBe(true)
    expect(hasLaravelValidationCode(invalid, 'email', 'unique')).toBe(false)
  })
})
