export interface AppointmentDraft {
  doctorId: number
  availabilityId: string
}

const storageKey = 'medaccess.appointmentDraft'

// Session storage keeps the review step refresh-safe without treating the
// browser draft as authoritative; Laravel revalidates the slot on confirmation.
export function saveAppointmentDraft(draft: AppointmentDraft): void {
  sessionStorage.setItem(storageKey, JSON.stringify(draft))
}

export function loadAppointmentDraft(): AppointmentDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Partial<AppointmentDraft> | null
    return value && Number.isInteger(value.doctorId) && typeof value.availabilityId === 'string'
      ? { doctorId: value.doctorId as number, availabilityId: value.availabilityId }
      : null
  } catch {
    return null
  }
}

export function clearAppointmentDraft(): void {
  sessionStorage.removeItem(storageKey)
}
