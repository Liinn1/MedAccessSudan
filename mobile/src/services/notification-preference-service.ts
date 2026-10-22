import { platformStorage } from '@/services/platform-storage'

export type NotificationPreferences = {
  push: boolean
  confirmations: boolean
  reminders: boolean
  changes: boolean
  homeVisits: boolean
  laboratory: boolean
}

const key = 'medaccess.notification-preferences.v1'
export const defaultNotificationPreferences: NotificationPreferences = {
  push: true,
  confirmations: true,
  reminders: true,
  changes: true,
  homeVisits: true,
  laboratory: true,
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const stored = await platformStorage.read(key)
  if (!stored) return defaultNotificationPreferences
  try { return { ...defaultNotificationPreferences, ...JSON.parse(stored) as Partial<NotificationPreferences> } }
  catch { return defaultNotificationPreferences }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  await platformStorage.write(key, JSON.stringify(preferences))
}
