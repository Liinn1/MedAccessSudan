import { apiClient } from './apiClient'

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'rejected' | 'pending'
export type AppointmentServiceType = 'clinic' | 'home_visit'

export interface DoctorAppointment {
  id: number
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  service_type: AppointmentServiceType
  notes: string | null
  patient: { id: number; name: string }
}

export async function getDoctorAppointments(signal?: AbortSignal): Promise<DoctorAppointment[]> {
  const response = await apiClient.get<{ data: DoctorAppointment[] }>('/api/v1/doctor/appointments', signal)
  return response.data
}
