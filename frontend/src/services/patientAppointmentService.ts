import { apiClient } from './apiClient'
import type { DoctorFilterOption } from './doctorService'

export type PatientAppointmentStatus = 'confirmed' | 'cancelled'

export interface PatientAppointment {
  id: number
  starts_at: string
  ends_at: string
  status: PatientAppointmentStatus
  service_type: 'clinic' | 'home_visit'
  notes: string | null
  doctor: {
    id: number
    name: string
    clinic_name: string | null
    profile_image_url: string | null
    specialization: DoctorFilterOption
    location: DoctorFilterOption
  }
}

export async function getPatientAppointments(signal?: AbortSignal): Promise<PatientAppointment[]> {
  const response = await apiClient.get<{ data: PatientAppointment[] }>('/api/v1/patient/appointments', signal)
  return response.data
}

export async function getPatientAppointment(id: number, signal?: AbortSignal): Promise<PatientAppointment> {
  const response = await apiClient.get<{ data: PatientAppointment }>(`/api/v1/patient/appointments/${id}`, signal)
  return response.data
}

export async function cancelPatientAppointment(id: number): Promise<PatientAppointment> {
  const response = await apiClient.patch<{ data: PatientAppointment }>(`/api/v1/patient/appointments/${id}/cancel`)
  return response.data
}

export async function bookPatientAppointment(input: { doctor_profile_id: number; starts_at: string; notes?: string }): Promise<PatientAppointment> {
  const response = await apiClient.post<{ data: PatientAppointment }>('/api/v1/patient/appointments', input)
  return response.data
}
