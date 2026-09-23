import { apiClient } from './apiClient'
import type { DoctorFilterOption } from './doctorService'

export type PatientAppointmentStatus = 'confirmed' | 'cancelled' | 'completed'
export interface DoctorReview { id: number; rating: number; comment: string | null; created_at: string }
export interface HomeVisitDetails { contact_phone: string; city: DoctorFilterOption | null; area: string; address_details: string; additional_directions: string | null; latitude?: string | null; longitude?: string | null }

export interface PatientAppointment {
  id: number
  starts_at: string
  ends_at: string
  status: PatientAppointmentStatus
  service_type: 'clinic' | 'home_visit'
  notes: string | null
  home_visit: HomeVisitDetails | null
  review: DoctorReview | null
  doctor: {
    id: number
    name: string
    clinic_name: string | null
    profile_image_url: string | null
    specialization: DoctorFilterOption
    location: DoctorFilterOption | null
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

export async function bookPatientAppointment(input: { doctor_profile_id: number; starts_at: string; service_type?: 'clinic' | 'home_visit'; notes?: string; home_visit?: Omit<HomeVisitDetails, 'latitude' | 'longitude' | 'city'> & { city: string; latitude: number; longitude: number } }): Promise<PatientAppointment> {
  const response = await apiClient.post<{ data: PatientAppointment }>('/api/v1/patient/appointments', input)
  return response.data
}

export async function submitDoctorReview(appointmentId: number, input: { rating: number; comment?: string }): Promise<DoctorReview> {
  const response = await apiClient.post<{ data: DoctorReview }>(`/api/v1/patient/appointments/${appointmentId}/review`, input)
  return response.data
}
