export const MEDACCESS_TIME_ZONE = 'Africa/Khartoum'

export function getMedAccessLocale(language: string): string {
  return language === 'ar' ? 'ar-SD' : 'en-SD'
}

export function formatMedAccessDateTime(
  value: string | number | Date,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getMedAccessLocale(language), {
    ...options,
    timeZone: MEDACCESS_TIME_ZONE,
  }).format(new Date(value))
}
