import { apiRequest } from '@/api/client'
import { File } from 'expo-file-system'
import type { MobileImageFile } from '@/services/auth-service'

export type ProviderVerificationStatus =
  | 'pending_documents'
  | 'under_review'
  | 'verified'
  | 'action_required'
  | 'suspended'

export type VerificationDocumentStatus = 'pending' | 'approved' | 'rejected' | 'replaced'

export interface VerificationDocument {
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
  current: VerificationDocument | null
}

export interface ProviderVerification {
  id: number
  provider_type: 'doctor' | 'laboratory'
  status: ProviderVerificationStatus
  admin_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  required_count: number
  submitted_count: number
  can_submit: boolean
  can_upload: boolean
  documents_locked: boolean
  requirements: VerificationRequirement[]
}

type VerificationResponse = { data: ProviderVerification }

export async function getProviderVerification(role: 'doctor' | 'laboratory') {
  const response = await apiRequest<VerificationResponse>(`/api/v1/${role}/verification`)
  return response.data
}

export async function uploadProviderVerificationDocument(
  role: 'doctor' | 'laboratory',
  documentType: string,
  file: MobileImageFile,
) {
  const uploadFile = new File(file.uri)
  if (!uploadFile.exists || uploadFile.size <= 0) {
    throw new Error('The selected verification document is not readable.')
  }
  const body = new FormData()
  body.append('document_type', documentType)
  body.append('file', uploadFile)
  const response = await apiRequest<VerificationResponse>(`/api/v1/${role}/verification/documents`, {
    method: 'POST',
    body,
    timeoutMs: 30000,
  })
  return response.data
}

export async function submitProviderVerification(role: 'doctor' | 'laboratory') {
  const response = await apiRequest<VerificationResponse>(`/api/v1/${role}/verification/submit`, {
    method: 'POST',
  })
  return response.data
}
