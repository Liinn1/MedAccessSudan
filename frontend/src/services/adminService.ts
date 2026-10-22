import { apiClient } from './apiClient'
import type { DoctorFilterOption } from './doctorService'
import type { AuthenticatedUser } from './authService'

export interface AdminLocation extends DoctorFilterOption { id: number; is_active?: boolean }

export interface AdminMetrics {
  verifications_awaiting_review: number
  inquiries_new: number
  test_requests_pending: number
  users_total: number
  pending_doctors: number
  verified_doctors: number
  verified_laboratories: number
  suspended_doctors: number
  registered_patients: number
  registered_doctors: number
  upcoming_appointments: number
  completed_appointments: number
  reviews: number
}

export interface AdminAttentionItem {
  key: string
  kind: 'verification' | 'inquiry' | 'test'
  section: 'verification' | 'inquiries' | 'requests'
  id: number
  title?: string
  subtitle: string
  at: string | null
  provider_type?: 'doctor' | 'laboratory'
  status?: string
  sender?: string
}

export interface AdminDashboardQueues {
  verifications: AdminAttentionItem[]
  inquiries: AdminAttentionItem[]
  tests: AdminAttentionItem[]
}

export interface AdminActivityItem {
  id: number
  action: string
  admin_name: string | null
  subject_type: string | null
  subject_id: number | null
  created_at: string | null
}

export interface AdminDashboardPayload {
  metrics: AdminMetrics
  attention: AdminAttentionItem[]
  queues: AdminDashboardQueues
  recent_activity: AdminActivityItem[]
}

export interface MonitoredUser {
  id: number
  name: string
  email: string
  phone: string | null
  role: 'patient' | 'doctor' | 'laboratory' | 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  verification_status?: string | null
  profile_image_url?: string | null
  first_name?: string | null
  last_name?: string | null
  doctor_profile?: { clinic_name: string | null; address: string | null; specialization: DoctorFilterOption | null; location: DoctorFilterOption | null } | null
  laboratory_profile?: { name: string; address: string; location: DoctorFilterOption | null } | null
}

export interface AccountListMeta {
  total: number
  from: number | null
  to: number | null
  current_page: number
  last_page: number
  per_page: number
}

export interface CustomerInquirySummary {
  id: number
  name: string
  email: string
  subject: string
  status: 'new' | 'in_progress' | 'resolved'
  preview: string
  last_message_at: string | null
  created_at: string | null
  messages?: Array<{ id: number; author_type: 'customer' | 'admin'; author_name: string; body: string; created_at: string | null }>
}

export interface CatalogRequestItem {
  id: number
  suggested_name: string
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string | null
  admin_note: string | null
  laboratory: { id: number | null; name: string | null; email: string | null }
  suggested_category: { id: number; slug: string; name_en: string; name_ar: string } | null
  resolved_test: { id: number; name_en: string; name_ar: string; short_name: string | null; slug: string } | null
}

export async function getAdminDashboard(signal?: AbortSignal) {
  return (await apiClient.get<{ data: AdminDashboardPayload }>('/api/v1/admin/dashboard', signal)).data
}

export async function getAdminUsers(query = '', signal?: AbortSignal) {
  const payload = (await apiClient.get<{ data: { users: MonitoredUser[]; meta?: AccountListMeta } }>(`/api/v1/admin/users${query}`, signal)).data
  return {
    users: payload.users,
    meta: payload.meta ?? {
      total: payload.users.length,
      from: payload.users.length ? 1 : null,
      to: payload.users.length || null,
      current_page: 1,
      last_page: 1,
      per_page: payload.users.length || 15,
    },
  }
}

export async function getAdminUser(id: number) {
  return (await apiClient.get<{ data: { user: MonitoredUser } }>(`/api/v1/admin/users/${id}`)).data.user
}

export async function createAdminUser(body: FormData | Record<string, unknown>) {
  await apiClient.initializeCsrfProtection()
  if (body instanceof FormData) return apiClient.postForm('/api/v1/admin/users', body)
  return apiClient.post('/api/v1/admin/users', body)
}

export async function updateAdminUser(id: number, input: { is_active?: boolean; name?: string; phone?: string | null; reason?: string }) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.patch<{ data: { user: MonitoredUser } }>(`/api/v1/admin/users/${id}`, input)).data.user
}

export interface AdministratorAccount {
  id: number
  name: string
  email: string
  phone: string | null
  role: 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
}

export async function updateAdminProfile(input: { name: string; phone: string | null }) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.put<{ data: { user: AuthenticatedUser } }>('/api/v1/admin/profile', input)).data.user
}

export async function updateAdminProfilePhoto(file: File) {
  await apiClient.initializeCsrfProtection()
  const form = new FormData()
  form.append('profile_photo', file)
  return (await apiClient.postForm<{ data: { user: AuthenticatedUser } }>('/api/v1/admin/profile-photo', form)).data.user
}

export async function removeAdminProfilePhoto() {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.delete<{ data: { user: AuthenticatedUser } }>('/api/v1/admin/profile-photo')).data.user
}

export async function getAdministrators(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { admins: AdministratorAccount[] } }>('/api/v1/admin/administrators', signal)).data.admins
}

export async function inviteAdministrator(input: { name: string; email: string; role: 'admin' }) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.post<{ data: { admin: AdministratorAccount } }>('/api/v1/admin/administrators', input)).data.admin
}

export async function updateAdministratorAccess(id: number, input: { is_active?: boolean }) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.patch<{ data: { admin: AdministratorAccount } }>(`/api/v1/admin/administrators/${id}`, input)).data.admin
}

export async function getAdminLocations(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { locations: AdminLocation[] } }>('/api/v1/admin/locations', signal)).data.locations
}

export async function updateLocationStatus(id: number, is_active: boolean) {
  await apiClient.initializeCsrfProtection()
  return apiClient.patch(`/api/v1/admin/locations/${id}`, { is_active })
}

export async function getAdminInquiries(query = '', signal?: AbortSignal) {
  return (await apiClient.get<{ data: { inquiries: CustomerInquirySummary[] } }>(`/api/v1/admin/inquiries${query}`, signal)).data.inquiries
}

export async function getAdminInquiry(id: number) {
  return (await apiClient.get<{ data: CustomerInquirySummary }>(`/api/v1/admin/inquiries/${id}`)).data
}

export async function updateInquiryStatus(id: number, status: CustomerInquirySummary['status']) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.patch<{ data: CustomerInquirySummary }>(`/api/v1/admin/inquiries/${id}`, { status })).data
}

export async function replyToInquiry(id: number, body: string) {
  await apiClient.initializeCsrfProtection()
  return (await apiClient.post<{ data: CustomerInquirySummary }>(`/api/v1/admin/inquiries/${id}/replies`, { body })).data
}

export async function getCatalogMatches(query: string) {
  return (await apiClient.get<{ data: { tests: Array<{ id: number; name_en: string; name_ar: string; short_name: string | null; slug: string }> } }>(`/api/v1/admin/catalog-requests/matches?q=${encodeURIComponent(query)}`)).data.tests
}

export async function getCatalogRequests(status = 'pending', signal?: AbortSignal) {
  const query = status && status !== 'all' ? `?status=${status}` : ''
  return (await apiClient.get<{ data: { requests: CatalogRequestItem[]; categories: Array<{ id: number; slug: string; name_en: string; name_ar: string }> } }>(`/api/v1/admin/catalog-requests${query}`, signal)).data
}

export async function reviewCatalogRequest(id: number, input: { action: 'approve' | 'map' | 'reject'; name_en?: string; name_ar?: string; short_name?: string; lab_test_category_id?: number; lab_test_id?: number; admin_note?: string }) {
  await apiClient.initializeCsrfProtection()
  return apiClient.patch(`/api/v1/admin/catalog-requests/${id}`, input)
}

export async function submitPublicContact(input: { name: string; email: string; subject: string; message: string }) {
  await apiClient.initializeCsrfProtection()
  return apiClient.post('/api/v1/contact', input)
}
