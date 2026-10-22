import { apiRequest } from '@/api/client'
import type { AuthenticatedUser } from '@/types/auth'

export interface PatientAppointment {
  id: number
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'in_progress' | 'cancelled' | 'completed'
  service_type: 'clinic' | 'home_visit'
  review: { id: number; rating: number; comment: string | null; created_at: string } | null
  home_visit: { area: string; address_details: string } | null
  doctor: {
    id: number
    name: string
    clinic_name: string | null
    profile_image_url: string | null
    specialization: LocalizedOption
    location: LocalizedOption | null
  }
}

export interface LocalizedOption {
  id?: number
  code?: string
  name_en: string
  name_ar: string
}

export interface DoctorSummary {
  id: number
  name: string
  clinic_name: string | null
  profile_image_url: string | null
  specialization: LocalizedOption
  location: LocalizedOption | null
  home_visit_location: LocalizedOption | null
  next_available_at: string | null
  average_rating: number
  review_count: number
}

export interface DoctorFilters {
  specializations: LocalizedOption[]
  locations: LocalizedOption[]
}

export interface LaboratoryTest {
  id: number
  name_en: string
  name_ar: string
  short_name: string | null
  category: LocalizedOption | null
  laboratory_count: number
  min_price: string | null
  currency: string
}

export type LaboratoryCollectionMethod = 'at_lab' | 'home_collection'

export interface LaboratoryMatch {
  laboratory_profile_id: number
  laboratory_name: string
  address: string
  location: LocalizedOption | null
  supports_at_lab: boolean
  supports_home_collection: boolean
  offers_all: boolean
  matched_count: number
  selected_count: number
  items: { lab_test_id: number; name_en: string; name_ar: string; short_name: string | null; price: string; currency: string }[]
  total: string
  currency: string
}

export interface LaboratoryDiscovery {
  tests: LaboratoryTest[]
  locations: LocalizedOption[]
  matches: { complete: LaboratoryMatch[]; partial: LaboratoryMatch[] }
}

export interface GlobalSearchResults {
  doctors: Pick<DoctorSummary, 'id' | 'name' | 'profile_image_url' | 'specialization' | 'location'>[]
  specializations: LocalizedOption[]
  laboratories: { id: number; name: string; location: LocalizedOption | null; supports_at_lab: boolean; supports_home_collection: boolean }[]
  tests: Pick<LaboratoryTest, 'id' | 'name_en' | 'name_ar' | 'short_name' | 'category'>[]
}

export interface LaboratoryOrder {
  id: number
  reference: string
  status: 'requested' | 'sample_collected' | 'in_progress' | 'result_ready'
  requested_at: string | null
  collection_method: 'at_lab' | 'home_collection'
  collection_starts_at: string | null
  laboratory_name: string
  location: LocalizedOption | null
  address: string | null
  total: string
  currency: string | null
  items: { id: number; name_en: string; name_ar: string; short_name: string | null }[]
  result: { id: number; uploaded_at: string | null; original_filename: string } | null
}

export type PatientUpcomingBooking =
  | { type: 'clinic_visit' | 'home_visit'; scheduled_at: string; appointment: PatientAppointment }
  | { type: 'laboratory'; scheduled_at: string; laboratory_order: LaboratoryOrder }

export interface PatientProfileInput {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface MobileProfilePhoto {
  uri: string
  name: string
  type: string
}

export async function getPatientAppointments(): Promise<PatientAppointment[]> {
  const response = await apiRequest<{ data: PatientAppointment[] }>('/api/v1/patient/appointments')
  return response.data
}

export async function submitPatientAppointmentReview(id: number, input: { rating: number; comment?: string }) {
  return (await apiRequest<{ data: { id: number; rating: number; comment: string | null; created_at: string } }>(`/api/v1/patient/appointments/${id}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })).data
}

export async function getPatientUpcomingBookings(): Promise<PatientUpcomingBooking[]> {
  const response = await apiRequest<{ data: PatientUpcomingBooking[] }>('/api/v1/patient/upcoming-bookings')
  return response.data
}

export async function getDoctorFilters(): Promise<DoctorFilters> {
  const response = await apiRequest<{ data: DoctorFilters }>('/api/v1/patient/doctor-filters')
  return response.data
}

export async function searchPatientDoctors(filters: {
  serviceType?: 'clinic' | 'home_visit'
  specialization?: string
  location?: string
} = {}): Promise<DoctorSummary[]> {
  const query = new URLSearchParams()
  if (filters.serviceType) query.set('service_type', filters.serviceType)
  if (filters.specialization) query.set('specialization', filters.specialization)
  if (filters.location) query.set('location', filters.location)
  const response = await apiRequest<{ data: { doctors: DoctorSummary[] } }>(
    `/api/v1/patient/doctors${query.size ? `?${query.toString()}` : ''}`,
  )
  return response.data.doctors
}

export async function getLaboratoryTests(search = ''): Promise<LaboratoryTest[]> {
  const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
  const response = await apiRequest<{ data: { tests: LaboratoryTest[] } }>(`/api/v1/patient/laboratory-offerings${query}`)
  return response.data.tests
}

export async function getLaboratoryDiscovery(input: { search?: string; testIds?: number[]; collectionMethod?: LaboratoryCollectionMethod } = {}): Promise<LaboratoryDiscovery> {
  const query = new URLSearchParams()
  if (input.search?.trim()) query.set('q', input.search.trim())
  if (input.collectionMethod) query.set('collection_method', input.collectionMethod)
  input.testIds?.forEach((id) => query.append('lab_test_ids[]', String(id)))
  const response = await apiRequest<{ data: LaboratoryDiscovery }>(`/api/v1/patient/laboratory-offerings${query.size ? `?${query.toString()}` : ''}`)
  return response.data
}

export async function createLaboratoryOrder(input: {
  laboratory_profile_id: number
  lab_test_ids: number[]
  collection_method: LaboratoryCollectionMethod
  collection_location_id?: number
  collection_area?: string
  collection_address?: string
  collection_notes?: string
  collection_starts_at?: string
  collection_latitude?: number
  collection_longitude?: number
}): Promise<LaboratoryOrder> {
  const response = await apiRequest<{ data: LaboratoryOrder }>('/api/v1/patient/laboratory-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, payment_method: 'pay_later' }),
  })
  return response.data
}

export async function getLaboratoryOrder(id: number): Promise<LaboratoryOrder> {
  const response = await apiRequest<{ data: LaboratoryOrder }>(`/api/v1/patient/laboratory-orders/${id}`)
  return response.data
}

export async function searchPatientHealthcare(search: string): Promise<GlobalSearchResults> {
  const response = await apiRequest<{ data: GlobalSearchResults }>(`/api/v1/patient/search?q=${encodeURIComponent(search.trim())}`)
  return response.data
}

export async function getLaboratoryOrders(): Promise<LaboratoryOrder[]> {
  const response = await apiRequest<{ data: LaboratoryOrder[] }>('/api/v1/patient/laboratory-orders')
  return response.data
}

export async function updatePatientProfile(input: PatientProfileInput): Promise<AuthenticatedUser> {
  const response = await apiRequest<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return response.data.user
}

export async function getPatientProfile(): Promise<AuthenticatedUser> {
  const response = await apiRequest<{ data: { user: AuthenticatedUser } }>('/api/v1/auth/me')
  return response.data.user
}

export async function updatePatientProfilePhoto(photo: MobileProfilePhoto): Promise<AuthenticatedUser> {
  const body = new FormData()
  body.append('profile_photo', photo as unknown as Blob)
  const response = await apiRequest<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile-photo', { method: 'POST', body })
  return response.data.user
}

export async function removePatientProfilePhoto(): Promise<AuthenticatedUser> {
  const response = await apiRequest<{ data: { user: AuthenticatedUser } }>('/api/v1/patient/profile-photo', { method: 'DELETE' })
  return response.data.user
}
