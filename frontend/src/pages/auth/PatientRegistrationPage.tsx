import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandMark } from '../../components/branding/BrandMark'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { EyeIcon, LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { LanguageToggle } from '../../components/LanguageToggle'
import { ApiError } from '../../services/apiClient'
import { registerPatient } from '../../services/authService'

interface RegistrationForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  passwordConfirmation: string
}

type RegistrationField = keyof RegistrationForm
type RegistrationErrors = Partial<Record<RegistrationField, string>>

const initialForm: RegistrationForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
}

export function PatientRegistrationPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: RegistrationField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    setStatusMessage('')
  }

  function validateForm(): RegistrationErrors {
    const nextErrors: RegistrationErrors = {}

    if (!form.firstName.trim()) nextErrors.firstName = 'required'
    if (!form.lastName.trim()) nextErrors.lastName = 'required'
    if (!form.email.trim()) {
      nextErrors.email = 'required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'invalid'
    }
    if (!form.phone.trim()) {
      nextErrors.phone = 'required'
    } else if (!/^\+?[0-9\s-]{7,20}$/.test(form.phone)) {
      nextErrors.phone = 'invalid'
    }
    if (!form.password) nextErrors.password = 'required'
    if (!form.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'required'
    } else if (form.password !== form.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'mismatch'
    }

    return nextErrors
  }

  function getError(field: RegistrationField): string | undefined {
    const error = errors[field]
    return error ? t(`auth.registration.errors.${field}.${error}`) : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('')
      return
    }

    setIsSubmitting(true)

    try {
      await registerPatient({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.passwordConfirmation,
      })
      setForm((current) => ({ ...current, password: '', passwordConfirmation: '' }))
      setStatusMessage('auth.registration.success')
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 422 && typeof error.details === 'object' && error.details !== null && 'errors' in error.details) {
        const serverErrors = error.details.errors
        if (typeof serverErrors === 'object' && serverErrors !== null) {
          setErrors({
            firstName: 'first_name' in serverErrors ? 'server' : undefined,
            lastName: 'last_name' in serverErrors ? 'server' : undefined,
            email: 'email' in serverErrors ? 'server' : undefined,
            phone: 'phone' in serverErrors ? 'server' : undefined,
            password: 'password' in serverErrors ? 'server' : undefined,
            passwordConfirmation: 'password' in serverErrors ? 'server' : undefined,
          })
          setStatusMessage('auth.registration.errors.correctFields')
        }
      } else if (error instanceof ApiError && error.status === 419) {
        setStatusMessage('auth.registration.errors.sessionExpired')
      } else if (error instanceof ApiError && error.status === 429) {
        setStatusMessage('auth.registration.errors.tooManyAttempts')
      } else {
        setStatusMessage('auth.registration.errors.serviceUnavailable')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function passwordToggle(visible: boolean, setVisible: (value: boolean) => void) {
    return (
      <button
        aria-label={t(visible ? 'auth.registration.hidePassword' : 'auth.registration.showPassword')}
        className="shrink-0 rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
        onClick={() => setVisible(!visible)}
        type="button"
      >
        <EyeIcon visible={visible} />
      </button>
    )
  }

  return (
    <main className="min-h-dvh bg-white px-5 py-4 sm:bg-[var(--color-background)] sm:px-8">
      {/* Registration intentionally scrolls on compact phones so six required
          fields retain readable labels and accessible touch targets. */}
      <section className="mx-auto w-full max-w-4xl rounded-3xl bg-white sm:border sm:border-[var(--color-border)] sm:px-10 sm:py-5 sm:shadow-sm lg:px-14">
        <div className="flex justify-end rtl:justify-start">
          <LanguageToggle />
        </div>

        <header className="mt-3 text-center">
          <BrandMark compact />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-primary)] sm:text-4xl">
            {t('auth.registration.title')}
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-[var(--color-text-secondary)] sm:text-base">
            {t('auth.registration.subtitle')}
          </p>
        </header>

        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 md:gap-x-5 md:gap-y-4">
            <InputField
              autoComplete="given-name"
              error={getError('firstName')}
              icon={<UserIcon />}
              id="registration-first-name"
              label={t('auth.registration.firstNameLabel')}
              onChange={(event) => updateField('firstName', event.target.value)}
              placeholder={t('auth.registration.firstNamePlaceholder')}
              value={form.firstName}
            />
            <InputField
              autoComplete="family-name"
              error={getError('lastName')}
              icon={<UserIcon />}
              id="registration-last-name"
              label={t('auth.registration.lastNameLabel')}
              onChange={(event) => updateField('lastName', event.target.value)}
              placeholder={t('auth.registration.lastNamePlaceholder')}
              value={form.lastName}
            />
            <InputField
              autoComplete="email"
              className="direction-ltr"
              error={getError('email')}
              icon={<MailIcon />}
              id="registration-email"
              inputMode="email"
              label={t('auth.registration.emailLabel')}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder={t('auth.registration.emailPlaceholder')}
              type="email"
              value={form.email}
            />
            <InputField
              autoComplete="tel"
              className="direction-ltr"
              error={getError('phone')}
              icon={<PhoneIcon />}
              id="registration-phone"
              inputMode="tel"
              label={t('auth.registration.phoneLabel')}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder={t('auth.registration.phonePlaceholder')}
              type="tel"
              value={form.phone}
            />
            <InputField
              autoComplete="new-password"
              endAdornment={passwordToggle(passwordVisible, setPasswordVisible)}
              error={getError('password')}
              icon={<LockIcon />}
              id="registration-password"
              label={t('auth.registration.passwordLabel')}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder={t('auth.registration.passwordPlaceholder')}
              type={passwordVisible ? 'text' : 'password'}
              value={form.password}
            />
            <InputField
              autoComplete="new-password"
              endAdornment={passwordToggle(confirmationVisible, setConfirmationVisible)}
              error={getError('passwordConfirmation')}
              icon={<LockIcon />}
              id="registration-password-confirmation"
              label={t('auth.registration.passwordConfirmationLabel')}
              onChange={(event) => updateField('passwordConfirmation', event.target.value)}
              placeholder={t('auth.registration.passwordConfirmationPlaceholder')}
              type={confirmationVisible ? 'text' : 'password'}
              value={form.passwordConfirmation}
            />
          </div>

          <div className="mt-3 min-h-10" aria-live="polite">
            {statusMessage && (
              <p className="rounded-xl bg-[var(--color-primary-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {t(statusMessage)}
              </p>
            )}
          </div>

          <div className="mx-auto mt-2 max-w-xl">
            <PrimaryButton disabled={isSubmitting} type="submit">
              {t(isSubmitting ? 'auth.registration.submitting' : 'auth.registration.submit')}
            </PrimaryButton>
            <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)] sm:text-base">
              {t('auth.registration.haveAccount')}{' '}
              <Link
                className="font-bold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                to="/login"
              >
                {t('auth.registration.signIn')}
              </Link>
            </p>
          </div>
        </form>
      </section>
    </main>
  )
}
