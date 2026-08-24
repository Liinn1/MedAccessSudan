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
