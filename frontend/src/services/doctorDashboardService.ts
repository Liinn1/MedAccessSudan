import { apiClient } from './apiClient'
import type { AuthenticatedUser } from './authService'
import type { DoctorFilterOption } from './doctorService'
import type { AppointmentServiceType, AppointmentStatus } from './doctorAppointmentService'

export const CONSULTATION_TYPE = {
  CLINIC: 'clinic',
  HOME_VISIT: 'home_visit',
} as const

export type ConsultationType = typeof CONSULTATION_TYPE[keyof typeof CONSULTATION_TYPE]

export interface DoctorDashboardProfile {
  id: number
  clinic_name: string | null
  biography: string | null
  biography_language: 'en' | 'ar' | null
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended'
  offers_clinic_visits: boolean
  offers_home_visits: boolean
  specialization: DoctorFilterOption | null
  location: DoctorFilterOption | null
  available_slots_count: number
  has_weekly_availability: boolean
  profile_image_url: string | null
  next_available: Partial<Record<ConsultationType, string | null>>
}

export interface AppointmentOverviewDay {
  date: string
  weekday: number
  completed: number
  upcoming: number
  cancelled: number
}

export interface SlotUtilizationSlice {
  booked: number
  available: number
}

export interface DoctorDashboardInsights {
  appointment_overview: {
    period: string
    from: string
    to: string
    totals: { total: number; completed: number; upcoming: number; cancelled: number }
    days: AppointmentOverviewDay[]
  }
  slot_utilization: {
    period: string
    from: string
    to: string
    all: SlotUtilizationSlice
    by_type: Partial<Record<ConsultationType, SlotUtilizationSlice>>
  }
  next_available: Partial<Record<ConsultationType, string | null>>
  upcoming_appointments: Array<{
    id: number
    starts_at: string
    ends_at: string
    status: AppointmentStatus
    service_type: AppointmentServiceType
    patient_name: string | null
  }>
}

export interface DoctorDashboardData {
  user: AuthenticatedUser
  profile: DoctorDashboardProfile | null
  insights: DoctorDashboardInsights | null
}

export async function getDoctorDashboard(signal?: AbortSignal): Promise<DoctorDashboardData> {
  const response = await apiClient.get<{ data: DoctorDashboardData }>('/api/v1/doctor/dashboard', signal)
  return response.data
}

export async function updateDoctorProfile(input: {
  clinic_name: string | null
  biography: string | null
  biography_language: 'en' | 'ar' | null
  offers_clinic_visits?: boolean
  offers_home_visits?: boolean
}): Promise<Pick<DoctorDashboardProfile, 'id' | 'clinic_name' | 'biography' | 'biography_language' | 'offers_clinic_visits' | 'offers_home_visits'>> {
  const response = await apiClient.put<{ data: { profile: Pick<DoctorDashboardProfile, 'id' | 'clinic_name' | 'biography' | 'biography_language' | 'offers_clinic_visits' | 'offers_home_visits'> } }>('/api/v1/doctor/profile', input)
  return response.data.profile
}
