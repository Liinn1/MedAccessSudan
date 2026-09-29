import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { MailIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { resendEmailVerification } from '../../services/authService'
import { isValidEmail } from '../../utils/authValidation'

interface VerifyRouteState {
  email?: string
  role?: 'patient' | 'doctor' | 'laboratory'
}

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const status = searchParams.get('status')
  const state = location.state as VerifyRouteState | null
  const [email, setEmail] = useState(() => state?.email?.trim() ?? '')
  const [emailError, setEmailError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isResending, setIsResending] = useState(false)
  const isProvider = state?.role === 'doctor' || state?.role === 'laboratory'
  const isResolved = status === 'success' || status === 'already'
  const isInvalid = status === 'invalid'

  const title = isResolved
    ? t(status === 'already' ? 'auth.verify.alreadyTitle' : 'auth.verify.successTitle')
    : isInvalid
      ? t('auth.verify.invalidTitle')
      : t('auth.verify.title')

  const subtitle = isResolved
    ? t(status === 'already' ? 'auth.verify.alreadyBody' : 'auth.verify.successBody')
    : isInvalid
      ? t('auth.verify.invalidBody')
      : t('auth.verify.subtitle')

  async function handleResend(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError(t('auth.verify.emailRequired'))
      return
    }
    if (!isValidEmail(trimmed)) {
      setEmailError(t('auth.verify.emailInvalid'))
      return
    }

    setEmailError('')
    setFeedback('')
    setIsResending(true)

    try {
      await resendEmailVerification(trimmed)
      setFeedback(t('auth.verify.resent'))
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) setFeedback(t('auth.verify.tooMany'))
      else setFeedback(t('auth.verify.serviceUnavailable'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <PublicLayout>
      <AuthShell title={title} subtitle={subtitle}>
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
          <MailIcon />
        </div>

        {!isResolved && (
          <form className="flex flex-col gap-4" noValidate onSubmit={handleResend}>
            {email
              ? <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('auth.verify.sentTo', { email })}</p>
              : <p className="text-sm text-[var(--color-text-secondary)]">{t('auth.verify.sentGeneric')}</p>}
            {!isInvalid && <p className="text-sm text-[var(--color-text-secondary)]">{t('auth.verify.checkInbox')}</p>}
            {isProvider && (
              <p className="rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {t('auth.verify.doctorNote')}
              </p>
            )}
            <InputField
              autoComplete="email"
              className="direction-ltr"
              error={emailError || undefined}
              icon={<MailIcon />}
              id="verify-email"
              label={t('auth.verify.emailLabel')}
              onChange={(event) => {
                setEmail(event.target.value)
                if (emailError) setEmailError('')
              }}
              placeholder={t('auth.verify.emailPlaceholder')}
              type="email"
              value={email}
            />
            {feedback && (
              <p aria-live="polite" className="rounded-xl bg-[var(--color-success-surface)] px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
                {feedback}
              </p>
            )}
            <PrimaryButton disabled={isResending} type="submit">
              {t(isResending ? 'auth.verify.resending' : 'auth.verify.resend')}
            </PrimaryButton>
          </form>
        )}

        <Link
          className="mt-4 inline-flex min-h-11 items-center justify-center text-sm font-bold text-[var(--color-primary)] hover:underline"
          to="/login"
        >
          {t(isResolved ? 'auth.verify.continueLogin' : 'auth.verify.backToLogin')}
        </Link>
      </AuthShell>
    </PublicLayout>
  )
}
