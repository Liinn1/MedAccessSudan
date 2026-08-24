import { apiClient } from './apiClient'
import type { AuthenticatedUser } from './authService'
import type { DoctorFilterOption } from './doctorService'

export interface DoctorDashboardProfile {
  id: number
  clinic_name: string | null
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended'
  specialization: DoctorFilterOption | null
  location: DoctorFilterOption | null
  available_slots_count: number
  profile_image_url: string | null
}

export interface DoctorDashboardData {
  user: AuthenticatedUser
  profile: DoctorDashboardProfile | null
}

export async function getDoctorDashboard(signal?: AbortSignal): Promise<DoctorDashboardData> {
  const response = await apiClient.get<{ data: DoctorDashboardData }>('/api/v1/doctor/dashboard', signal)
  return response.data
}
