import { apiClient } from './apiClient'
import type { ConsultationType } from './doctorDashboardService'

export interface SchedulePeriod {
  id?: number
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active?: boolean
  consultation_type?: ConsultationType
}

export interface AvailabilityException {
  id: number
  exception_date: string
  type: 'unavailable' | 'modified' | 'blocked'
  start_time: string | null
  end_time: string | null
  consultation_type?: ConsultationType
}

export interface ExceptionInput {
  exception_date: string
  type: AvailabilityException['type']
  start_time?: string | null
  end_time?: string | null
  consultation_type: ConsultationType
}

export interface ResolvedDate {
  date: string
  slots: { starts_at: string; ends_at: string; consultation_type?: ConsultationType }[]
}

export interface DoctorScheduleData {
  offers_clinic_visits: boolean
  offers_home_visits: boolean
  periods: SchedulePeriod[]
  exceptions: AvailabilityException[]
}

function query(consultationType?: ConsultationType) {
  return consultationType ? `?consultation_type=${consultationType}` : ''
}

export async function getDoctorSchedule(signal?: AbortSignal, consultationType?: ConsultationType) {
  return (await apiClient.get<{ data: DoctorScheduleData }>(`/api/v1/doctor/schedule${query(consultationType)}`, signal)).data
}

export async function replaceDoctorSchedule(consultationType: ConsultationType, periods: SchedulePeriod[]) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.put<{ data: DoctorScheduleData }>('/api/v1/doctor/schedule', { consultation_type: consultationType, periods })).data
}

export async function createAvailabilityException(input: ExceptionInput) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.post<{ data: AvailabilityException }>('/api/v1/doctor/schedule/exceptions', input)).data
}

export async function updateAvailabilityException(id: number, input: ExceptionInput) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.put<{ data: AvailabilityException }>(`/api/v1/doctor/schedule/exceptions/${id}`, input)).data
}

export async function deleteAvailabilityException(id: number) {
  await apiClient.initializeCsrfProtection()
  await apiClient.delete(`/api/v1/doctor/schedule/exceptions/${id}`)
}

export async function getResolvedDoctorAvailability(signal?: AbortSignal, consultationType?: ConsultationType) {
  return (await apiClient.get<{ data: { timezone: string; dates: ResolvedDate[] } }>(`/api/v1/doctor/resolved-availability${query(consultationType)}`, signal)).data
}
