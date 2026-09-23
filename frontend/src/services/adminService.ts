import { apiClient } from './apiClient'
import type { DoctorFilterOption } from './doctorService'

export interface AdminLocation extends DoctorFilterOption { id: number; is_active?: boolean }

export interface CityProposal {
  id: number
  proposed_name: string
  status: 'pending' | 'approved' | 'mapped' | 'rejected'
  doctor: { id: number; name: string; email: string }
  likely_matches: AdminLocation[]
}

export interface ProviderApplication {
  id: number
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended'
  user: { id: number; name: string; email: string; phone: string | null }
  specialization: DoctorFilterOption
  location: AdminLocation | null
  city_proposal: { id: number; proposed_name: string; status: string } | null
}

export interface AdminMetrics { pending_doctors: number; verified_doctors: number; suspended_doctors: number; pending_city_proposals: number; registered_patients: number; registered_doctors: number; upcoming_appointments: number; completed_appointments: number; reviews: number }
export interface MonitoredUser { id: number; name: string; email: string; phone: string | null; role: 'patient' | 'doctor' | 'admin' | 'super_admin'; is_active: boolean; created_at: string }
export interface MonitoredAppointment { id: number; starts_at: string; status: string; service_type: string; patient: { id: number; name: string; email: string }; doctor_profile: { user: { id: number; name: string; email: string } } }
export interface MonitoredReview { id: number; rating: number; comment: string | null; appointment_id: number; patient: { id: number; name: string }; doctor_profile: { user: { id: number; name: string } }; appointment: { id: number; starts_at: string; status: string } }
export type AdminAccount = MonitoredUser

export async function getAdminMetrics(signal?: AbortSignal) { return (await apiClient.get<{ data: { metrics: AdminMetrics } }>('/api/v1/admin/dashboard', signal)).data.metrics }
export async function getAdminUsers(signal?: AbortSignal) { return (await apiClient.get<{ data: { users: MonitoredUser[] } }>('/api/v1/admin/users', signal)).data.users }
export async function getAdminAppointments(signal?: AbortSignal) { return (await apiClient.get<{ data: { appointments: MonitoredAppointment[] } }>('/api/v1/admin/appointments', signal)).data.appointments }
export async function getAdminReviews(signal?: AbortSignal) { return (await apiClient.get<{ data: { reviews: MonitoredReview[] } }>('/api/v1/admin/reviews', signal)).data.reviews }
export async function getAdminAccounts(signal?: AbortSignal) { return (await apiClient.get<{ data: { admins: AdminAccount[] } }>('/api/v1/admin/administrators', signal)).data.admins }
export async function createAdminAccount(input: { name: string; email: string; phone?: string; password: string; password_confirmation: string; role: 'admin' | 'super_admin' }) { await apiClient.initializeCsrfProtection(); return apiClient.post('/api/v1/admin/administrators', input) }
export async function updateAdminAccount(id: number, input: { role?: 'admin' | 'super_admin'; is_active?: boolean }) { await apiClient.initializeCsrfProtection(); return apiClient.patch(`/api/v1/admin/administrators/${id}`, input) }

export async function getCityProposals(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { proposals: CityProposal[]; locations: AdminLocation[] } }>('/api/v1/admin/city-proposals', signal)).data
}

export async function resolveCityProposal(id: number, input: { action: 'approve' | 'map' | 'reject'; name_en?: string; name_ar?: string; location_id?: number }) {
  await apiClient.initializeCsrfProtection()
  return apiClient.patch(`/api/v1/admin/city-proposals/${id}`, input)
}

export async function getProviderApplications(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { providers: ProviderApplication[] } }>('/api/v1/admin/providers', signal)).data.providers
}

export async function getAdminLocations(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { locations: AdminLocation[] } }>('/api/v1/admin/locations', signal)).data.locations
}

export async function updateLocationStatus(id: number, is_active: boolean) {
  await apiClient.initializeCsrfProtection()
  return apiClient.patch(`/api/v1/admin/locations/${id}`, { is_active })
}

export async function updateProviderVerification(id: number, status: ProviderApplication['verification_status']) {
  await apiClient.initializeCsrfProtection()
  return apiClient.patch(`/api/v1/admin/providers/${id}/verification`, { status })
}
