export const SUDAN_TIME_ZONE = 'Africa/Khartoum'

export function sudanDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: SUDAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function greetingPeriod(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hourCycle: 'h23', timeZone: SUDAN_TIME_ZONE }).formatToParts(date).find((part) => part.type === 'hour')?.value ?? '12')
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

