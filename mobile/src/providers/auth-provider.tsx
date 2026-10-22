import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, setApiBearerToken, setApiUnauthorizedHandler } from '@/api/client'
import { loginAccount, logoutPatient, registerPatient, restoreAuthenticatedUser, type PatientRegistrationInput } from '@/services/auth-service'
import { secureSession } from '@/services/secure-session'
import type { AuthenticatedUser, AuthenticationStatus } from '@/types/auth'

type AuthContextValue = {
  status: AuthenticationStatus
  user: AuthenticatedUser | null
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>
  register: (input: PatientRegistrationInput) => Promise<AuthenticatedUser>
  logout: () => Promise<void>
  updateCurrentUser: (user: AuthenticatedUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthenticationStatus>('bootstrapping')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    let active = true
    void secureSession.read().then(async (token) => {
      if (!token) return null
      try {
        const restored = await restoreAuthenticatedUser(token)
        if (restored.role === 'admin' || restored.role === 'super_admin') throw new ApiError({ code: 'http', message: 'Unsupported mobile role.', status: 403 })
        return restored
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await secureSession.clear()
          setApiBearerToken(null)
          return null
        }
        throw error
      }
    }).then((restored) => {
      if (!active) return
      setUser(restored)
      setStatus(restored ? 'authenticated' : 'unauthenticated')
    }).catch(() => {
      if (!active) return
      setApiBearerToken(null)
      setUser(null)
      setStatus('unauthenticated')
    })
    return () => { active = false }
  }, [])

  const login = useCallback(async (identifier: string, password: string, remember = true) => {
    const authenticated = await loginAccount(identifier, password)
    try {
      if (remember) await secureSession.write(authenticated.token)
      else await secureSession.clear()
      setUser(authenticated.user)
      setStatus('authenticated')
    } catch (error) {
      await logoutPatient().catch(() => undefined)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try { await logoutPatient() }
    finally {
      await secureSession.clear()
      setApiBearerToken(null)
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    setApiUnauthorizedHandler(async () => {
      await secureSession.clear()
      setApiBearerToken(null)
      setUser(null)
      setStatus('unauthenticated')
    })
    return () => setApiUnauthorizedHandler(null)
  }, [])

  const register = useCallback((input: PatientRegistrationInput) => registerPatient(input), [])
  const updateCurrentUser = useCallback((updated: AuthenticatedUser) => setUser(updated), [])

  const value = useMemo(() => ({ status, user, login, register, logout, updateCurrentUser }), [login, logout, register, status, updateCurrentUser, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
