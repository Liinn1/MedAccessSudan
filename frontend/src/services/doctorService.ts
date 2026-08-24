import { apiClient } from './apiClient'

export interface DoctorFilterOption {
  code: string
  name_en: string
  name_ar: string
}

export interface DoctorSummary {
  id: number
  name: string
  clinic_name: string | null
  specialization: DoctorFilterOption
  location: DoctorFilterOption
  next_available_at: string
  profile_image_url: string | null
}

export interface DoctorAvailabilitySlot {
  id: string
  starts_at: string
  ends_at: string
  status: 'available'
}

export interface DoctorProfile extends Omit<DoctorSummary, 'next_available_at'> {
  bio_en: string | null
  bio_ar: string | null
  profile_image_url: string | null
  verification_status: 'verified'
  availability: DoctorAvailabilitySlot[]
}

interface DoctorFiltersResponse {
  data: {
    specializations: DoctorFilterOption[]
    locations: DoctorFilterOption[]
  }
}

interface DoctorSearchResponse {
  data: { doctors: DoctorSummary[] }
  meta: { total: number }
}

export async function getDoctorFilters(signal?: AbortSignal): Promise<DoctorFiltersResponse['data']> {
  const response = await apiClient.get<DoctorFiltersResponse>('/api/v1/patient/doctor-filters', signal)
  return response.data
}

export async function searchDoctors(filters: { specialization: string; location: string; availability: 'today' | 'week' }, signal?: AbortSignal): Promise<DoctorSearchResponse> {
  const query = new URLSearchParams(filters)
  return apiClient.get<DoctorSearchResponse>(`/api/v1/patient/doctors?${query}`, signal)
}

export async function getDoctorProfile(doctorId: number, signal?: AbortSignal): Promise<DoctorProfile> {
  const response = await apiClient.get<{ data: DoctorProfile }>(`/api/v1/patient/doctors/${doctorId}`, signal)
  return response.data
}
