import { describe, expect, it } from 'vitest'
import { localizedName } from './localizedName'

describe('localizedName', () => {
  const city = { name_en: 'Khartoum', name_ar: 'الخرطوم' }

  it('selects the requested language', () => {
    expect(localizedName(city, 'en')).toBe('Khartoum')
    expect(localizedName(city, 'ar-SD')).toBe('الخرطوم')
  })

  it('falls back to the available translation', () => {
    expect(localizedName({ name_en: 'Sennar', name_ar: '' }, 'ar')).toBe('Sennar')
    expect(localizedName({ name_en: '', name_ar: 'سنار' }, 'en')).toBe('سنار')
  })
})
