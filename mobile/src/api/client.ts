import type { ApiErrorDetails } from '@/types/api'

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
let bearerToken: string | null = null
let unauthorizedHandler: (() => void | Promise<void>) | null = null

type ApiRequestOptions = RequestInit & { timeoutMs?: number }

export function setApiBearerToken(token: string | null) {
  bearerToken = token
}

export function setApiUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  readonly code: ApiErrorDetails['code']
  readonly status?: number
  readonly backendCode?: string
  readonly validationErrors?: Record<string, string[]>
  readonly validationCodes?: Record<string, string[]>
  constructor(details: ApiErrorDetails) {
    super(details.message)
    this.name = 'ApiError'
    this.code = details.code
    this.status = details.status
    this.backendCode = details.backendCode
    this.validationErrors = details.validationErrors
    this.validationCodes = details.validationCodes
  }
}

function apiBaseUrl(): string {
  if (!configuredApiUrl) throw new ApiError({ code: 'configuration', message: 'EXPO_PUBLIC_API_URL is not configured.' })
  return configuredApiUrl.replace(/\/$/, '')
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs = 8000, ...requestOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const url = `${apiBaseUrl()}${path}`
  const method = requestOptions.method ?? 'GET'
  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        ...requestOptions.headers,
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as {
        code?: string
        errors?: Record<string, string[]>
        validation_codes?: Record<string, string[]>
        message?: string
      } | null
      if (response.status === 401 && bearerToken && unauthorizedHandler) {
        await unauthorizedHandler()
      }
      if (__DEV__) {
        const detail = `[MedAccess API] ${method} ${url} -> HTTP ${response.status}${payload?.code ? ` (${payload.code})` : ''}`
        if (response.status >= 500) console.error(detail)
        else console.debug(detail)
      }
      throw new ApiError({
        code: 'http',
        message: payload?.message || `API request failed with status ${response.status}.`,
        status: response.status,
        backendCode: payload?.code,
        validationErrors: payload?.errors,
        validationCodes: payload?.validation_codes,
      })
    }
    try { return (await response.json()) as T }
    catch { throw new ApiError({ code: 'invalid_response', message: 'The API returned an invalid response.' }) }
  } catch (error) {
    if (error instanceof ApiError) throw error
    const timedOut = error instanceof Error && error.name === 'AbortError'
    const networkFailure = timedOut || (
      error instanceof TypeError
      && /network request failed|failed to fetch|load failed/i.test(error.message)
    )
    if (__DEV__) {
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      console.debug(`[MedAccess API] ${method} ${url} -> ${timedOut ? 'TIMEOUT' : networkFailure ? 'NETWORK_UNREACHABLE' : 'REQUEST_PREPARATION_FAILED'} (${detail})`)
    }
    if (networkFailure) {
      const message = timedOut ? 'The request timed out.' : 'Network request failed.'
      throw new ApiError({ code: 'network', message })
    }
    throw new ApiError({ code: 'request', message: 'The request could not be prepared.' })
  } finally { clearTimeout(timeout) }
}
