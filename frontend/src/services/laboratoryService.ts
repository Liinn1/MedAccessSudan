import { apiClient } from './apiClient'
import type { AuthenticatedUser } from './authService'
import type { ServicePayment } from './paymentTypes'

export type LaboratoryOrderStatus = 'requested' | 'sample_collected' | 'in_progress' | 'result_ready'

export interface NamedOption {
  id?: number
  code?: string
  name_en: string
  name_ar: string
}

export interface LaboratoryOfferingConfig {
  id: number
  price: string
  currency: string
  estimated_turnaround_hours: number
  is_available: boolean
}

export interface CatalogTest {
  id: number
  name_en: string
  name_ar: string
  short_name: string | null
  offering: LaboratoryOfferingConfig | null
}

export interface PatientCatalogTest {
  id: number
  name_en: string
  name_ar: string
  short_name: string | null
  category: NamedOption | null
  laboratory_count: number
  min_price: string | null
  currency: string
}

export interface LaboratoryMatchItem {
  lab_test_id: number
  name_en: string
  name_ar: string
  short_name: string | null
  price: string
  currency: string
  estimated_turnaround_hours: number
}

export interface LaboratoryMatch {
  laboratory_profile_id: number
  laboratory_name: string
  address: string
  location: NamedOption | null
  offers_all: boolean
  matched_count: number
  selected_count: number
  missing_test_ids: number[]
  items: LaboratoryMatchItem[]
  total: string
  currency: string
}

export interface PatientLaboratoryDiscovery {
  categories: NamedOption[]
  locations: NamedOption[]
  tests: PatientCatalogTest[]
  matches: { complete: LaboratoryMatch[]; partial: LaboratoryMatch[] }
}

export interface CatalogGroup {
  id: number
  slug: string
  name_en: string
  name_ar: string
  tests: CatalogTest[]
}

export interface LaboratoryOrderItem {
  id: number
  lab_test_id: number
  name_en: string
  name_ar: string
  short_name: string | null
  price: string
  currency: string
  estimated_turnaround_hours: number
}

export interface LaboratoryOrder {
  id: number
  reference: string
  status: LaboratoryOrderStatus
  requested_at: string
  laboratory_name: string
  laboratory_profile_id: number
  location?: NamedOption | null
  address?: string | null
  total?: string
  currency?: string | null
  patient?: { id: number; name: string; phone: string | null }
  items?: LaboratoryOrderItem[]
  events?: Array<{ id: number; from_status: string | null; to_status: string; created_at: string }>
  result?: { id: number; uploaded_at: string; mime_type: string; original_filename: string; size_bytes: number } | null
  payment?: ServicePayment | null
}

export interface LaboratoryProfilePayload {
  id: number
  name: string
  address: string
  verification_status: string
  profile_image_url: string | null
  location: NamedOption | null
  phone: string | null
}

export interface LaboratoryActivityDay {
  date: string
  count: number
}

export interface LaboratoryCatalogCategorySummary {
  name_en: string
  name_ar: string
  count: number
}

export interface LaboratoryMostRequested {
  name_en: string
  name_ar: string
  short_name: string | null
  count: number
}

export interface LaboratoryDashboardData {
  user: AuthenticatedUser
  profile: LaboratoryProfilePayload
  summary: { pending_requests: number; in_progress: number; results_ready: number; tests_offered: number; tests_unavailable: number }
  recent_requests: LaboratoryOrder[]
  awaiting_results: LaboratoryOrder[]
  request_activity: LaboratoryActivityDay[]
  catalog_categories: LaboratoryCatalogCategorySummary[]
  most_requested: LaboratoryMostRequested[]
}

export function laboratoryStatusClass(status: LaboratoryOrderStatus): string {
  if (status === 'requested') return 'border-amber-200 bg-amber-50 text-amber-900'
  if (status === 'sample_collected') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'in_progress') return 'border-teal-200 bg-[var(--color-primary-surface)] text-teal-900'
  return 'border-emerald-200 bg-[var(--color-success-surface)] text-emerald-800'
}

export async function getLaboratoryDashboard(signal?: AbortSignal): Promise<LaboratoryDashboardData> {
  return (await apiClient.get<{ data: LaboratoryDashboardData }>('/api/v1/laboratory/dashboard', signal)).data
}

export async function getLaboratoryCatalog(query = '', categoryId?: number, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (categoryId) params.set('category_id', String(categoryId))
  const suffix = params.toString() ? `?${params}` : ''
  return (await apiClient.get<{ data: { categories: NamedOption[]; groups: CatalogGroup[] } }>(`/api/v1/laboratory/catalog${suffix}`, signal)).data
}

export async function saveLaboratoryOffering(labTestId: number, input: { price: string; estimated_turnaround_hours: number; is_available: boolean }) {
  return (await apiClient.put<{ data: LaboratoryOfferingConfig }>(`/api/v1/laboratory/offerings/${labTestId}`, input)).data
}

export async function requestCatalogAddition(input: { suggested_name: string; suggested_lab_test_category_id?: number; note?: string }) {
  return apiClient.post('/api/v1/laboratory/catalog-requests', input)
}

export async function getLaboratoryOrders(status = 'all', query = '', signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (query) params.set('q', query)
  const suffix = params.toString() ? `?${params}` : ''
  return (await apiClient.get<{ data: LaboratoryOrder[] }>(`/api/v1/laboratory/orders${suffix}`, signal)).data
}

export async function getLaboratoryOrder(id: number, signal?: AbortSignal) {
  return (await apiClient.get<{ data: LaboratoryOrder }>(`/api/v1/laboratory/orders/${id}`, signal)).data
}

export async function transitionLaboratoryOrder(id: number, status: LaboratoryOrderStatus) {
  return (await apiClient.patch<{ data: LaboratoryOrder }>(`/api/v1/laboratory/orders/${id}/status`, { status })).data
}

export async function uploadLaboratoryResult(id: number, file: File) {
  const form = new FormData()
  form.append('result', file)
  await apiClient.initializeCsrfProtection()
  return (await apiClient.postForm<{ data: LaboratoryOrder }>(`/api/v1/laboratory/orders/${id}/result`, form)).data
}

export async function openLaboratoryResult(path: string) {
  const { blob, filename } = await apiClient.download(path)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  return filename
}

export async function downloadLaboratoryResult(path: string) {
  const { blob, filename } = await apiClient.download(path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function getLaboratoryProfile(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { user: AuthenticatedUser; profile: LaboratoryProfilePayload } }>('/api/v1/laboratory/profile', signal)).data
}

export async function updateLaboratoryProfile(input: { name: string; phone: string; address: string; location: string }) {
  return (await apiClient.put<{ data: { user: AuthenticatedUser; profile: LaboratoryProfilePayload } }>('/api/v1/laboratory/profile', input)).data
}

export async function updateLaboratoryProfilePhoto(file: File) {
  const form = new FormData()
  form.append('profile_photo', file)
  await apiClient.initializeCsrfProtection()
  return (await apiClient.postForm<{ data: { profile_image_url: string } }>('/api/v1/laboratory/profile-photo', form)).data.profile_image_url
}

export async function getPatientLaboratoryOrders(signal?: AbortSignal) {
  return (await apiClient.get<{ data: LaboratoryOrder[] }>('/api/v1/patient/laboratory-orders', signal)).data
}

export function formatLaboratoryPrice(price: string | number | null | undefined, currency: string | null | undefined, locale: string) {
  if (price === null || price === undefined || price === '') return ''
  const formatted = new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-SD' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(price))
  return `${formatted} ${currency || 'SDG'}`
}

export async function getPatientLaboratoryDiscovery(input: { query?: string; categoryId?: number; locationId?: number; labTestIds?: number[] } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (input.query) params.set('q', input.query)
  if (input.categoryId) params.set('category_id', String(input.categoryId))
  if (input.locationId) params.set('location_id', String(input.locationId))
  input.labTestIds?.forEach((id) => params.append('lab_test_ids[]', String(id)))
  const suffix = params.toString() ? `?${params}` : ''
  return (await apiClient.get<{ data: PatientLaboratoryDiscovery }>(`/api/v1/patient/laboratory-offerings${suffix}`, signal)).data
}

export async function getPatientLaboratoryOfferings(query = '', signal?: AbortSignal) {
  return getPatientLaboratoryDiscovery({ query }, signal)
}

export async function getPatientLaboratoryOrder(id: number, signal?: AbortSignal) {
  return (await apiClient.get<{ data: LaboratoryOrder }>(`/api/v1/patient/laboratory-orders/${id}`, signal)).data
}

export async function createPatientLaboratoryOrder(laboratoryProfileId: number, labTestIds: number[], paymentMethod: 'card' | 'pay_later') {
  return (await apiClient.post<{ data: LaboratoryOrder }>('/api/v1/patient/laboratory-orders', {
    laboratory_profile_id: laboratoryProfileId,
    lab_test_ids: labTestIds,
    payment_method: paymentMethod,
  })).data
}
