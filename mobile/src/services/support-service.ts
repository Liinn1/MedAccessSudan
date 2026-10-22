import { apiRequest } from '@/api/client'

export interface SupportQueryInput {
  name: string
  email: string
  subject: string
  message: string
}

export async function submitSupportQuery(input: SupportQueryInput): Promise<number> {
  const response = await apiRequest<{ data: { id: number }; message: string }>('/api/v1/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.id
}
