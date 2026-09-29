import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { LoadingState } from '../../components/feedback/LoadingState'
import { InputField } from '../../components/forms/InputField'
import { EyeIcon, LockIcon, MailIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { useSignUpModal } from '../../contexts/signUpModal'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, login, resendEmailVerification } from '../../services/authService'
import { isValidEmail } from '../../utils/authValidation'
import { getAuthenticatedDestination } from '../../utils/navigation'

interface LoginFormErrors {
  identifier?: boolean
  password?: boolean
}

interface LoginRouteState {
  registrationSuccess?: boolean
  registrationRole?: 'patient' | 'doctor'
  verificationEmail?: string
}

function getApiErrorCode(error: ApiError): string | undefined {
  if (typeof error.details !== 'object' || error.details === null || !('code' in error.details)) return undefined
  return typeof error.details.code === 'string' ? error.details.code : undefined
}

export function PatientLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [verificationEmail] = useState(() => {
    const state = location.state as LoginRouteState | null
    return state?.verificationEmail?.trim() ?? ''
  })
  const [registrationRole] = useState<'patient' | 'doctor' | null>(() => {
    const state = location.state as LoginRouteState | null
    if (state?.verificationEmail) return state.registrationRole === 'doctor' ? 'doctor' : 'patient'
    return state?.registrationSuccess && (state.registrationRole === 'patient' || state.registrationRole === 'doctor') ? state.registrationRole : null
  })
  const openSignUpModal = useSignUpModal()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [statusMessageKey, setStatusMessageKey] = useState(() => searchParams.get('verified') === '1' ? 'auth.login.emailVerified' : '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!registrationRole) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, navigate, registrationRole])

  useEffect(() => {
    const requestController = new AbortController()

    getCurrentUser(requestController.signal)
      .then((user) => {
        const destination = getAuthenticatedDestination(user.role, location.search)
        if (!destination) {
          setIsCheckingSession(false)
          return
        }
        navigate(destination, { replace: true })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (!(error instanceof ApiError) || error.status !== 401) {
          setStatusMessageKey('auth.login.errors.serviceUnavailable')
        }
        setIsCheckingSession(false)
      })

    return () => requestController.abort()
  }, [location.search, navigate])

  function validateForm(): LoginFormErrors {
    const nextErrors: LoginFormErrors = {}

    if (!identifier.trim()) nextErrors.identifier = true
    if (!password) nextErrors.password = true

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)
    setStatusMessageKey('')

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const user = await login(identifier.trim(), password)
      setPassword('')
      const destination = getAuthenticatedDestination(user.role, location.search)
      if (!destination) {
        setStatusMessageKey('auth.login.errors.invalidCredentials')
        setIsSubmitting(false)
        return
      }
      navigate(destination, { replace: true })
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const errorCode = getApiErrorCode(error)
        if (errorCode === 'INVALID_CREDENTIALS') {
          setStatusMessageKey('auth.login.errors.invalidCredentials')
        } else if (errorCode === 'TOO_MANY_ATTEMPTS') {
          setStatusMessageKey('auth.login.errors.tooManyAttempts')
        } else if (errorCode === 'EMAIL_UNVERIFIED') {
          const maybeEmail = identifier.trim()
          if (isValidEmail(maybeEmail)) {
            navigate('/verify-email', { replace: true, state: { email: maybeEmail } })
            return
          }
          setStatusMessageKey('auth.login.errors.unverified')
        } else if (error.status === 419) {
          setStatusMessageKey('auth.login.errors.sessionExpired')
        } else {
          setStatusMessageKey('auth.login.errors.serviceUnavailable')
        }
      } else {
        setStatusMessageKey('auth.login.errors.serviceUnavailable')
      }
      setIsSubmitting(false)
    }
  }

  const isResolvingSession = isCheckingSession || isSubmitting

  return (
    <PublicLayout>
      <AuthShell title={t('auth.login.welcomeBack')} subtitle={t('auth.login.patientTagline')}>
        {isResolvingSession ? (
          <LoadingState section message={t(isSubmitting ? 'auth.login.submitting' : 'auth.login.checkingSession')} />
        ) : (
          <form className="flex flex-col" noValidate onSubmit={handleSubmit}>
          {(verificationEmail || registrationRole) && (
            <div aria-live="polite" className="page-enter mb-4 rounded-2xl border border-emerald-200 bg-[var(--color-success-surface)] px-4 py-2.5 text-sm font-semibold text-emerald-800" role="status">
              {verificationEmail
                ? t('auth.login.verificationSent', { email: verificationEmail })
                : t('auth.login.registrationSuccess')}
            </div>
          )}
          <div className="space-y-4">
            <InputField
              autoComplete="username"
              className="direction-ltr"
              error={errors.identifier ? t('auth.login.errors.identifierRequired') : undefined}
              icon={<MailIcon />}
              id="login-identifier"
              inputMode="text"
              label={t('auth.login.identifierLabel')}
              name="username"
              onBlur={() => {
                if (!identifier.trim()) setErrors((current) => ({ ...current, identifier: true }))
              }}
              onChange={(event) => {
                setIdentifier(event.target.value)
                if (errors.identifier) setErrors((current) => ({ ...current, identifier: undefined }))
              }}
              placeholder={t('auth.login.identifierPlaceholder')}
              value={identifier}
            />

            <InputField
              autoComplete="current-password"
              error={errors.password ? t('auth.login.errors.passwordRequired') : undefined}
              icon={<LockIcon />}
              id="login-password"
              label={t('auth.login.passwordLabel')}
              name="password"
              onBlur={() => {
                if (!password) setErrors((current) => ({ ...current, password: true }))
              }}
              onChange={(event) => {
                setPassword(event.target.value)
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
              }}
              placeholder={t('auth.login.passwordPlaceholder')}
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              endAdornment={
                <button
                  aria-label={t(passwordVisible ? 'auth.login.hidePassword' : 'auth.login.showPassword')}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon visible={passwordVisible} />
                </button>
              }
            />
          </div>

          <button
            className="mt-2 min-h-11 self-end rounded-lg px-1 text-sm font-semibold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] rtl:self-start"
            onClick={() => setStatusMessageKey('auth.login.recoveryPending')}
            type="button"
          >
            {t('auth.login.forgotPassword')}
          </button>

          <div className="mt-1" aria-live="polite">
            {statusMessageKey && (
              <p className={`mb-1 rounded-xl px-3 py-2 text-sm ${statusMessageKey === 'auth.login.emailVerified' || statusMessageKey === 'auth.login.verificationResent' ? 'bg-[var(--color-success-surface)] font-semibold text-emerald-800' : 'bg-[var(--color-primary-surface)] text-[var(--color-text-secondary)]'}`}>
                {t(statusMessageKey)}
              </p>
            )}
          </div>
          {verificationEmail && (
            <button
              className="mb-2 self-start text-sm font-bold text-[var(--color-primary)] hover:underline disabled:opacity-60"
              disabled={isResending}
              onClick={async () => {
                setIsResending(true)
                try {
                  await resendEmailVerification(verificationEmail)
                  setStatusMessageKey('auth.login.verificationResent')
                } catch (error) {
                  if (error instanceof ApiError && error.status === 429) setStatusMessageKey('auth.login.errors.tooManyAttempts')
                  else setStatusMessageKey('auth.login.errors.serviceUnavailable')
                } finally {
                  setIsResending(false)
                }
              }}
              type="button"
            >
              {t(isResending ? 'auth.login.resendingVerification' : 'auth.login.resendVerification')}
            </button>
          )}

          <div className="pt-1">
            <PrimaryButton type="submit">
              {t('auth.login.submit')}
            </PrimaryButton>
            <div className="auth-form-divider" role="separator">
              <span>{t('auth.login.or')}</span>
            </div>
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              {t('auth.login.noAccount')}{' '}
              <button
                className="font-bold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                onClick={openSignUpModal}
                type="button"
              >
                {t('auth.login.createAccount')}
              </button>
            </p>
          </div>
        </form>
        )}
      </AuthShell>
    </PublicLayout>
  )
}
