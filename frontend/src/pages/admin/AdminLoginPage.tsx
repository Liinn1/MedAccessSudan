import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { ForgotPasswordFlow, RememberMeRow } from '../../components/auth/ForgotPasswordFlow'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { LoadingState } from '../../components/feedback/LoadingState'
import { InputField } from '../../components/forms/InputField'
import { EyeIcon, LockIcon, MailIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { loginAdmin, restoreSession } from '../../services/authService'
import { consumeAuthNotice, getApiErrorCode, isAbortError } from '../../services/apiClient'
import { isValidEmail } from '../../utils/authValidation'

interface LoginFormErrors {
  email?: boolean
  password?: boolean
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
    return error.status
  }
  return undefined
}

export function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [statusMessageKey, setStatusMessageKey] = useState(() => consumeAuthNotice() === 'suspended' ? 'auth.login.errors.suspended' : '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [remember, setRemember] = useState(false)
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    restoreSession()
      .then((user) => {
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          navigate('/admin/dashboard', { replace: true })
          return
        }
        if (consumeAuthNotice() === 'suspended') setStatusMessageKey('auth.login.errors.suspended')
        setIsCheckingSession(false)
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        if (getApiErrorCode(error) === 'ACCOUNT_SUSPENDED' || consumeAuthNotice() === 'suspended') {
          setStatusMessageKey('auth.login.errors.suspended')
        }
        setIsCheckingSession(false)
      })
  }, [navigate])

  function validateForm(): LoginFormErrors {
    const nextErrors: LoginFormErrors = {}
    if (!email.trim()) nextErrors.email = true
    else if (!isValidEmail(email)) nextErrors.email = true
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
      const user = await loginAdmin(email.trim(), password, remember)
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setStatusMessageKey('admin.login.invalid')
        setIsSubmitting(false)
        return
      }
      setPassword('')
      navigate('/admin/dashboard', { replace: true })
    } catch (error: unknown) {
      const status = getErrorStatus(error)
      const errorCode = getApiErrorCode(error)
      if (errorCode === 'ACCOUNT_SUSPENDED') setStatusMessageKey('auth.login.errors.suspended')
      else if (errorCode === 'INVALID_CREDENTIALS' || status === 422) setStatusMessageKey('admin.login.invalid')
      else if (errorCode === 'TOO_MANY_ATTEMPTS' || status === 429) setStatusMessageKey('admin.login.tooManyAttempts')
      else if (status === 419) setStatusMessageKey('admin.login.sessionExpired')
      else setStatusMessageKey('admin.login.error')
      setIsSubmitting(false)
    }
  }

  return (
    <PublicLayout>
      <AuthShell eyebrow={t('admin.login.eyebrow')} subtitle={forgot ? t('auth.forgot.subtitle') : t('admin.login.description')} title={forgot ? t('auth.forgot.title') : t('admin.login.title')}>
        {forgot ? (
          <ForgotPasswordFlow loginPath="/admin/login" onCancel={() => setForgot(false)} />
        ) : isCheckingSession || isSubmitting ? (
          <LoadingState section message={t(isSubmitting ? 'admin.login.signingIn' : 'admin.login.checkingSession')} />
        ) : (
          <form className="flex flex-col" noValidate onSubmit={handleSubmit}>
            <div className="space-y-4">
              <InputField
                autoComplete="username"
                className="direction-ltr"
                error={errors.email ? t(email.trim() ? 'admin.login.emailInvalid' : 'admin.login.emailRequired') : undefined}
                icon={<MailIcon />}
                id="admin-email"
                inputMode="email"
                label={t('admin.login.email')}
                name="email"
                onBlur={() => {
                  if (!email.trim() || !isValidEmail(email)) setErrors((current) => ({ ...current, email: true }))
                }}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
                }}
                placeholder={t('admin.login.email')}
                type="email"
                value={email}
              />
              <InputField
                autoComplete="current-password"
                error={errors.password ? t('admin.login.passwordRequired') : undefined}
                icon={<LockIcon />}
                id="admin-password"
                label={t('admin.login.password')}
                name="password"
                onBlur={() => {
                  if (!password) setErrors((current) => ({ ...current, password: true }))
                }}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
                }}
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
            <RememberMeRow checked={remember} onForgot={() => setForgot(true)} onToggle={setRemember} />
            <div className="mt-3" aria-live="polite">
              {statusMessageKey && (
                <p className="mb-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
                  {t(statusMessageKey)}
                </p>
              )}
            </div>
            <div className="pt-2">
              <PrimaryButton type="submit">{t('admin.login.submit')}</PrimaryButton>
            </div>
          </form>
        )}
      </AuthShell>
    </PublicLayout>
  )
}
