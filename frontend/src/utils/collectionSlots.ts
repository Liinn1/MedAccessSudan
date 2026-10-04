import { SUDAN_TIME_ZONE, sudanDateKey } from './dateTime'

export interface CollectionSlot {
  starts_at: string
  timeZone: string
}

export function generateHomeCollectionSlots(now = new Date()): CollectionSlot[] {
  const slots: CollectionSlot[] = []
  for (let day = 0; day < 7; day += 1) {
    const probe = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
    const dateKey = sudanDateKey(probe)
    for (let hour = 8; hour <= 16; hour += 1) {
      const startsAt = `${dateKey}T${String(hour).padStart(2, '0')}:00:00+02:00`
      if (new Date(startsAt) <= now) continue
      slots.push({ starts_at: startsAt, timeZone: SUDAN_TIME_ZONE })
    }
  }
  return slots.slice(0, 24)
}
