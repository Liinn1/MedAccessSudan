import { File } from 'expo-file-system'
import { apiRequest } from '@/api/client'
import type { AuthenticatedUser } from '@/types/auth'

export type ConsultationType = 'clinic' | 'home_visit'
export type AppointmentStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface LocalizedOption { code: string; name_en: string; name_ar: string }
export interface DoctorProfile {
  id: number; clinic_name: string | null; biography: string | null
  biography_language: 'en' | 'ar' | null; verification_status: string
  offers_clinic_visits: boolean; offers_home_visits: boolean
  specialization: LocalizedOption | null; location: LocalizedOption | null
  address: string | null
  available_slots_count: number; has_weekly_availability: boolean
  profile_image_url: string | null
  next_available: Partial<Record<ConsultationType, string | null>>
}
export interface DoctorAppointment {
  id: number; starts_at: string; ends_at: string; status: AppointmentStatus
  service_type: ConsultationType; notes: string | null
  home_visit: null | { contact_phone: string | null; city: LocalizedOption | null; area: string | null; address_details: string | null; additional_directions: string | null; latitude: number | null; longitude: number | null }
  patient: { id: number; name: string }
}
export interface DoctorDashboard {
  user: AuthenticatedUser
  profile: DoctorProfile | null
  insights: null | {
    appointment_overview: { totals: { total: number; completed: number; upcoming: number; cancelled: number } }
    upcoming_appointments: { id: number; starts_at: string; ends_at: string; status: AppointmentStatus; service_type: ConsultationType; patient_name: string | null }[]
  }
}
export interface SchedulePeriod { id?: number; day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number; is_active?: boolean; consultation_type?: ConsultationType }
export interface AvailabilityException { id: number; exception_date: string; type: 'unavailable' | 'modified' | 'blocked'; start_time: string | null; end_time: string | null; consultation_type?: ConsultationType }
export interface DoctorSchedule { offers_clinic_visits: boolean; offers_home_visits: boolean; periods: SchedulePeriod[]; exceptions: AvailabilityException[] }

export async function getDoctorDashboard() {
  return (await apiRequest<{ data: DoctorDashboard }>('/api/v1/doctor/dashboard')).data
}
export async function getDoctorAppointments() {
  return (await apiRequest<{ data: DoctorAppointment[] }>('/api/v1/doctor/appointments')).data
}
export async function completeDoctorAppointment(id: number) {
  return (await apiRequest<{ data: DoctorAppointment }>(`/api/v1/doctor/appointments/${id}/complete`, { method: 'PATCH' })).data
}
export async function startDoctorAppointment(id: number) {
  return (await apiRequest<{ data: DoctorAppointment }>(`/api/v1/doctor/appointments/${id}/start`, { method: 'PATCH' })).data
}
export async function getDoctorSchedule(type?: ConsultationType) {
  const query = type ? `?consultation_type=${type}` : ''
  return (await apiRequest<{ data: DoctorSchedule }>(`/api/v1/doctor/schedule${query}`)).data
}
export async function replaceDoctorSchedule(type: ConsultationType, periods: SchedulePeriod[]) {
  return (await apiRequest<{ data: DoctorSchedule }>('/api/v1/doctor/schedule', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultation_type: type, periods }),
  })).data
}
export async function createDoctorScheduleException(input: { exception_date: string; type: AvailabilityException['type']; start_time?: string | null; end_time?: string | null; consultation_type: ConsultationType }) {
  return (await apiRequest<{ data: AvailabilityException }>('/api/v1/doctor/schedule/exceptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })).data
}
export async function deleteDoctorScheduleException(id: number) {
  await apiRequest(`/api/v1/doctor/schedule/exceptions/${id}`, { method: 'DELETE' })
}
export async function updateDoctorProfile(input: Pick<DoctorProfile, 'clinic_name' | 'biography' | 'biography_language' | 'offers_clinic_visits' | 'offers_home_visits'> & { location: string; address: string }) {
  return (await apiRequest<{ data: { profile: Pick<DoctorProfile, 'id' | 'clinic_name' | 'biography' | 'biography_language' | 'offers_clinic_visits' | 'offers_home_visits'> } }>('/api/v1/doctor/profile', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })).data.profile
}
export async function updateDoctorProfilePhoto(uri: string) {
  const file = new File(uri)
  if (!file.exists || file.size <= 0) throw new Error('Selected image is not readable.')
  const body = new FormData(); body.append('profile_photo', file)
  return (await apiRequest<{ data: { profile_image_url: string } }>('/api/v1/doctor/profile-photo', { method: 'POST', body, timeoutMs: 30000 })).data
}
