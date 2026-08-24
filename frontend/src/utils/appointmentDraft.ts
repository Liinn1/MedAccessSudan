export interface AppointmentDraft {
  doctorId: number
  availabilityId: string
}

const storageKey = 'medaccess.appointmentDraft'

export function saveAppointmentDraft(draft: AppointmentDraft): void {
  sessionStorage.setItem(storageKey, JSON.stringify(draft))
}
