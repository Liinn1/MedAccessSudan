export type ApiErrorCode = 'configuration' | 'network' | 'request' | 'http' | 'invalid_response'
export interface ApiErrorDetails {
  code: ApiErrorCode
  message: string
  status?: number
  backendCode?: string
  validationErrors?: Record<string, string[]>
  validationCodes?: Record<string, string[]>
}
export interface HealthResponse { status: 'ok'; service: string; database: string }
