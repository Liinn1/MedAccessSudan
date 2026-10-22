import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState } from '../feedback/ErrorState'
import { LoadingState } from '../feedback/LoadingState'
import { clearSessionCache, restoreSession, type AuthenticatedUser, type UserRole } from '../../services/authService'
import { buildLoginPath } from '../../utils/navigation'

interface ProtectedRouteProps {
  roles: UserRole[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    restoreSession().then((current) => {
      if (!active) return
      setUser(current)
      setState('ready')
    }).catch(() => {
      if (active) setState('error')
    })
    return () => { active = false }
  }, [attempt])

  if (state === 'loading') return <LoadingState />
  if (state === 'error') return <ErrorState message={t('common.sessionVerificationError')} onRetry={() => { clearSessionCache(); setState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('common.retry')} />
  if (!user || !roles.includes(user.role)) {
    const adminOnly = roles.every((role) => role === 'admin' || role === 'super_admin')
    return <Navigate replace state={{ from: location.pathname }} to={adminOnly ? '/admin/login' : buildLoginPath(`${location.pathname}${location.search}`)} />
  }

  return <Outlet />
}
