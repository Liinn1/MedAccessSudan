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
  location: DoctorFilterOption | null
  next_available_at: string | null
  profile_image_url: string | null
}

export interface DoctorAvailabilitySlot {
  id: string
  starts_at: string
  ends_at: string
  status: 'available'
}

export interface DoctorProfile extends Omit<DoctorSummary, 'next_available_at'> {
  biography: string | null
  biography_language: 'en' | 'ar'
  biography_is_translated: boolean
  profile_image_url: string | null
  verification_status: 'verified'
  availability: DoctorAvailabilitySlot[]
  average_rating: number
  review_count: number
  reviews: { id: number; rating: number; comment: string | null; created_at: string }[]
}

export interface FeaturedDoctor {
  id: number; name: string; profile_image_url: string | null; specialization: DoctorFilterOption; location: DoctorFilterOption; average_rating: number; review_count: number; verification_status: string
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

export async function searchDoctors(filters: { specialization?: string; location?: string; availability?: 'today' | 'week'; service_type?: 'clinic' | 'home_visit' }, signal?: AbortSignal): Promise<DoctorSearchResponse> {
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])))
  return apiClient.get<DoctorSearchResponse>(`/api/v1/patient/doctors?${query}`, signal)
}

export async function getDoctorProfile(doctorId: number, signal?: AbortSignal, serviceType: 'clinic' | 'home_visit' = 'clinic'): Promise<DoctorProfile> {
  const response = await apiClient.get<{ data: DoctorProfile }>(`/api/v1/patient/doctors/${doctorId}?service_type=${serviceType}`, signal)
  return response.data
}

export async function getFeaturedDoctors(signal?: AbortSignal): Promise<FeaturedDoctor[]> {
  const response = await apiClient.get<{ data: FeaturedDoctor[] }>('/api/v1/doctors/featured', signal)
  return response.data
}
