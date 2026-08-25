const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is not configured.')
}

const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, '')

function getXsrfToken(): string | undefined {
  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))

  return tokenCookie
    ? decodeURIComponent(tokenCookie.slice('XSRF-TOKEN='.length))
    : undefined
}

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Sends typed requests to the Laravel REST API.
 *
 * Responses must be JSON. Non-success responses become ApiError instances so
 * pages can show friendly messages without depending on Laravel internals.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const xsrfToken = getXsrfToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Accept-Language': document.documentElement.lang || 'en',
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
      ...options.headers,
    },
  })

  const responseBody: unknown = response.status === 204
    ? null
    : await response.json().catch(() => null)

  if (!response.ok) {
    const apiMessage =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody &&
      typeof responseBody.message === 'string'
        ? responseBody.message
        : 'The server could not complete the request.'

    throw new ApiError(apiMessage, response.status, responseBody)
  }

  return responseBody as T
}

export const apiClient = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { method: 'GET', signal })
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  },
  postForm<T>(path: string, body: FormData): Promise<T> {
    return request<T>(path, { method: 'POST', body })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
  async initializeCsrfProtection(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new ApiError('Unable to initialize CSRF protection.', response.status)
    }
  },
}
