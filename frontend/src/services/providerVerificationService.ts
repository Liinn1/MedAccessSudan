import { apiClient } from './apiClient'

export type ProviderVerificationStatus =
  | 'pending_documents'
  | 'under_review'
  | 'verified'
  | 'action_required'
  | 'suspended'

export type VerificationDocumentStatus = 'pending' | 'approved' | 'rejected' | 'replaced'

export interface VerificationDocumentPayload {
  id: number
  document_type: string
  original_filename: string
  mime_type: string
  file_size: number
  status: VerificationDocumentStatus
  admin_note: string | null
  uploaded_at: string | null
}

export interface VerificationRequirement {
  document_type: string
  required: boolean
  current: VerificationDocumentPayload | null
}

export interface ProviderVerificationPayload {
  id: number
  provider_type: 'doctor' | 'laboratory'
  provider_name: string
  status: ProviderVerificationStatus
  admin_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: { id: number; name: string } | null
  required_count: number
  submitted_count: number
  rejected_count: number
  can_submit: boolean
  can_upload: boolean
  documents_locked: boolean
  requirements: VerificationRequirement[]
}

export interface ProviderVerificationListItem {
  id: number
  provider_type: 'doctor' | 'laboratory'
  provider_name: string
  status: ProviderVerificationStatus
  submitted_at: string | null
  reviewed_at: string | null
  required_count: number
  submitted_count: number
  user: { id: number; name: string; email: string; phone: string | null } | null
}

function unwrap(payload: { data: ProviderVerificationPayload }) {
  return payload.data
}

export async function getProviderVerification(role: 'doctor' | 'laboratory', signal?: AbortSignal) {
  return unwrap(await apiClient.get<{ data: ProviderVerificationPayload }>(`/api/v1/${role}/verification`, signal))
}

export async function uploadVerificationDocument(role: 'doctor' | 'laboratory', documentType: string, file: File) {
  const form = new FormData()
  form.append('document_type', documentType)
  form.append('file', file)
  await apiClient.initializeCsrfProtection()
  return unwrap(await apiClient.postForm<{ data: ProviderVerificationPayload }>(`/api/v1/${role}/verification/documents`, form))
}

export async function submitProviderVerification(role: 'doctor' | 'laboratory') {
  await apiClient.initializeCsrfProtection()
  return unwrap(await apiClient.post<{ data: ProviderVerificationPayload }>(`/api/v1/${role}/verification/submit`))
}

export async function downloadVerificationDocument(role: 'doctor' | 'laboratory' | 'admin', documentId: number, verificationId?: number) {
  const path = role === 'admin'
    ? `/api/v1/admin/verifications/${verificationId}/documents/${documentId}`
    : `/api/v1/${role}/verification/documents/${documentId}`
  return apiClient.download(path)
}

export async function getAdminVerifications(signal?: AbortSignal) {
  return (await apiClient.get<{ data: { verifications: ProviderVerificationListItem[] } }>('/api/v1/admin/verifications', signal)).data.verifications
}

export async function getAdminVerification(id: number, signal?: AbortSignal) {
  return unwrap(await apiClient.get<{ data: ProviderVerificationPayload }>(`/api/v1/admin/verifications/${id}`, signal))
}

export async function approveAdminVerification(id: number) {
  await apiClient.initializeCsrfProtection()
  return unwrap(await apiClient.post<{ data: ProviderVerificationPayload }>(`/api/v1/admin/verifications/${id}/approve`))
}

export async function requestAdminVerificationChanges(id: number, admin_note: string) {
  await apiClient.initializeCsrfProtection()
  return unwrap(await apiClient.post<{ data: ProviderVerificationPayload }>(`/api/v1/admin/verifications/${id}/request-changes`, { admin_note }))
}

export async function reviewAdminVerificationDocument(verificationId: number, documentId: number, status: 'approved' | 'rejected', admin_note?: string) {
  await apiClient.initializeCsrfProtection()
  return unwrap(await apiClient.patch<{ data: ProviderVerificationPayload }>(`/api/v1/admin/verifications/${verificationId}/documents/${documentId}`, { status, admin_note }))
}

export function verificationBadgeClass(status: string) {
  if (status === 'verified') return 'border-emerald-200 bg-[var(--color-success-surface)] text-emerald-800'
  if (status === 'under_review') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'action_required') return 'border-amber-200 bg-amber-50 text-amber-900'
  if (status === 'suspended') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-teal-200 bg-[var(--color-primary-surface)] text-teal-900'
}
