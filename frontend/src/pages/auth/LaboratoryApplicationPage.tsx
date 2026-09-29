import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { LoadingState } from '../../components/feedback/LoadingState'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout } from '../../services/authService'

/** Post-login holding page until the laboratory dashboard is built. */
export function LaboratoryApplicationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getCurrentUser(controller.signal)
      .then((user) => {
        if (user.role !== 'laboratory') {
          navigate('/login', { replace: true })
          return
        }
        setName(user.name)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 401) navigate('/login', { replace: true })
        else setLoading(false)
      })
    return () => controller.abort()
  }, [navigate])

  if (loading) {
    return (
      <PublicLayout>
        <AuthShell title={t('auth.laboratoryApplication.title')} subtitle={t('auth.laboratoryApplication.subtitle')}>
          <LoadingState section message={t('auth.login.checkingSession')} />
        </AuthShell>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <AuthShell title={t('auth.laboratoryApplication.title')} subtitle={t('auth.laboratoryApplication.subtitle')}>
        {name && <p className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>}
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{t('auth.laboratoryApplication.body')}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t('auth.laboratoryApplication.approvalNote')}</p>
        <div className="mt-6">
          <PrimaryButton
            onClick={async () => {
              await logout()
              navigate('/', { replace: true })
            }}
            type="button"
          >
            {t('auth.laboratoryApplication.signOut')}
          </PrimaryButton>
        </div>
        <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-primary)] hover:underline" to="/">
          {t('auth.backHome')}
        </Link>
      </AuthShell>
    </PublicLayout>
  )
}

