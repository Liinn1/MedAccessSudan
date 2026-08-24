import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/branding/BrandMark'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { EyeIcon, LockIcon, MailIcon } from '../../components/icons/AuthIcons'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, login, type AuthenticatedUser } from '../../services/authService'
import { getSafeRedirect } from '../../utils/navigation'
import { PublicLayout } from '../../layouts/PublicLayout'

interface LoginFormErrors {
  identifier?: boolean
  password?: boolean
}

function getApiErrorCode(error: ApiError): string | undefined {
  if (typeof error.details !== 'object' || error.details === null || !('code' in error.details)) return undefined
  return typeof error.details.code === 'string' ? error.details.code : undefined
}

export function PatientLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = getSafeRedirect(location.search)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [statusMessageKey, setStatusMessageKey] = useState('')
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const requestController = new AbortController()

    getCurrentUser(requestController.signal)
      .then((user) => {
        setAuthenticatedUser(user)
        if (user.role === 'patient') {
          navigate(destination, { replace: true })
        } else {
          setStatusMessageKey('auth.login.errors.patientOnly')
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (!(error instanceof ApiError) || error.status !== 401) {
          setStatusMessageKey('auth.login.errors.serviceUnavailable')
        }
      })
      .finally(() => setIsCheckingSession(false))

    return () => requestController.abort()
  }, [destination, navigate])

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
      setAuthenticatedUser(user)
      setPassword('')
      if (user.role === 'patient') {
        navigate(destination, { replace: true })
      } else {
        setStatusMessageKey('auth.login.errors.patientOnly')
      }
    } catch (error: unknown) {
      setAuthenticatedUser(null)

      if (error instanceof ApiError) {
        const errorCode = getApiErrorCode(error)
        if (errorCode === 'INVALID_CREDENTIALS') {
          setStatusMessageKey('auth.login.errors.invalidCredentials')
        } else if (errorCode === 'TOO_MANY_ATTEMPTS') {
          setStatusMessageKey('auth.login.errors.tooManyAttempts')
        } else if (error.status === 419) {
          setStatusMessageKey('auth.login.errors.sessionExpired')
        } else {
          setStatusMessageKey('auth.login.errors.serviceUnavailable')
        }
      } else {
        setStatusMessageKey('auth.login.errors.serviceUnavailable')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-[var(--color-primary-surface)]/70 to-[var(--color-background)] px-5 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto flex w-full max-w-2xl flex-col rounded-3xl border border-[var(--color-border)] bg-white px-5 py-7 shadow-[0_18px_45px_rgb(15_118_110/0.08)] sm:px-10 sm:py-9 lg:px-16">
        <header className="text-center">
          <Link aria-label={t('publicHome.header.logoLabel')} className="inline-block rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" to="/"><BrandMark /></Link>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-primary)] [@media(min-height:760px)]:mt-4 [@media(min-height:760px)]:text-4xl">{t('auth.login.brandName')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)] [@media(min-height:760px)]:mt-2 [@media(min-height:760px)]:text-base">{t('auth.login.tagline')}</p>
        </header>

        <form className="mt-6 flex flex-col sm:mt-8" noValidate onSubmit={handleSubmit}>
          <div className="space-y-4 [@media(min-height:760px)]:space-y-5">
            <InputField
              autoComplete="username"
              className="direction-ltr"
              error={errors.identifier ? t('auth.login.errors.identifierRequired') : undefined}
              icon={<MailIcon />}
              id="login-identifier"
              inputMode="text"
              label={t('auth.login.identifierLabel')}
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
                  className="shrink-0 rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon visible={passwordVisible} />
                </button>
              }
            />
          </div>

          <button
            className="mt-3 self-end rounded text-sm font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] rtl:self-start [@media(min-height:760px)]:mt-4"
            onClick={() => setStatusMessageKey('auth.login.recoveryPending')}
            type="button"
          >
            {t('auth.login.forgotPassword')}
          </button>

          <div className="mt-2 min-h-10" aria-live="polite">
            {statusMessageKey && (
              <p className="rounded-xl bg-[var(--color-primary-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {t(statusMessageKey, authenticatedUser ? {
                  name: authenticatedUser.name,
                  role: t(`roles.${authenticatedUser.role}`),
                } : undefined)}
              </p>
            )}
          </div>

          <div className="pt-3 [@media(min-height:760px)]:pt-6">
            <PrimaryButton disabled={isSubmitting || isCheckingSession} type="submit">
              {t(isSubmitting ? 'auth.login.submitting' : isCheckingSession ? 'auth.login.checkingSession' : 'auth.login.submit')}
            </PrimaryButton>
            <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)] [@media(min-height:760px)]:mt-4 [@media(min-height:760px)]:text-base">
              {t('auth.login.noAccount')}{' '}
              <Link
                className="font-bold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                to={{ pathname: '/register', search: location.search }}
              >
                {t('auth.login.createAccount')}
              </Link>
            </p>
          </div>
        </form>
        <Link className="mt-3 text-center text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" to="/">{t('auth.backHome')}</Link>
      </section>
      </div>
    </PublicLayout>
  )
}
