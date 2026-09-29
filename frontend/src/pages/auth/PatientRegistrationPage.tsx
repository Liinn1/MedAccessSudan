import { useState, type FormEvent, type FocusEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { EyeIcon, LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { ApiError } from '../../services/apiClient'
import { registerPatient } from '../../services/authService'
import { PublicLayout } from '../../layouts/PublicLayout'
import { isValidEmail, isValidPhone, isValidRegistrationPassword, laravelFieldErrors, profilePhotoIssue } from '../../utils/authValidation'

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

const fieldIds: Record<RegistrationField, string> = {
  firstName: 'registration-first-name',
  lastName: 'registration-last-name',
  email: 'registration-email',
  phone: 'registration-phone',
  password: 'registration-password',
  passwordConfirmation: 'registration-password-confirmation',
}

export function PatientRegistrationPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({})
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoError, setProfilePhotoError] = useState('')

  function fieldError(field: RegistrationField): string | undefined {
    const code = errors[field]
    return code ? t(`auth.registration.errors.${field}.${code}`) : undefined
  }

  function validateField(field: RegistrationField, values: RegistrationForm = form): string | undefined {
    const value = values[field]
    if (field === 'firstName' || field === 'lastName') return value.trim() ? undefined : 'required'
    if (field === 'email') {
      if (!value.trim()) return 'required'
      return isValidEmail(value) ? undefined : 'invalid'
    }
    if (field === 'phone') {
      if (!value.trim()) return 'required'
      return isValidPhone(value) ? undefined : 'invalid'
    }
    if (field === 'password') {
      if (!value) return 'required'
      return isValidRegistrationPassword(value) ? undefined : 'weak'
    }
    if (field === 'passwordConfirmation') {
      if (!value) return 'required'
      return value === values.password ? undefined : 'mismatch'
    }
    return undefined
  }

  function validateForm(): RegistrationErrors {
    const nextErrors: RegistrationErrors = {}
    ;(Object.keys(initialForm) as RegistrationField[]).forEach((field) => {
      const code = validateField(field)
      if (code) nextErrors[field] = code
    })
    return nextErrors
  }

  function updateField(field: RegistrationField, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (touched[field] || errors[field]) {
        setErrors((currentErrors) => ({ ...currentErrors, [field]: validateField(field, next) }))
      }
      return next
    })
    setStatusMessage('')
  }

  function handleBlur(field: RegistrationField) {
    return (event: FocusEvent<HTMLInputElement>) => {
      setTouched((current) => ({ ...current, [field]: true }))
      setErrors((current) => ({ ...current, [field]: validateField(field, { ...form, [field]: event.target.value }) }))
    }
  }

  function handlePhoto(file: File | null) {
    const issue = profilePhotoIssue(file, false)
    setProfilePhoto(issue === 'invalid' ? null : file)
    setProfilePhotoError(issue === 'invalid' ? t('profilePhoto.invalid') : '')
  }

  function focusFirstError(nextErrors: RegistrationErrors) {
    const first = (Object.keys(initialForm) as RegistrationField[]).find((field) => nextErrors[field])
    if (first) document.getElementById(fieldIds[first])?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, passwordConfirmation: true })

    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('')
      focusFirstError(nextErrors)
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
        profile_photo: profilePhoto,
      })
      navigate('/verify-email', { replace: true, state: { email: form.email.trim(), role: 'patient' } })
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 422) {
        const server = laravelFieldErrors(error.details)
        setErrors({
          firstName: server.first_name ? 'server' : undefined,
          lastName: server.last_name ? 'server' : undefined,
          email: server.email ? 'server' : undefined,
          phone: server.phone ? 'server' : undefined,
          password: server.password ? 'server' : undefined,
          passwordConfirmation: server.password_confirmation ? 'server' : undefined,
        })
        setProfilePhotoError(server.profile_photo ? t('profilePhoto.invalid') : '')
        setStatusMessage('auth.registration.errors.correctFields')
        focusFirstError({
          firstName: server.first_name ? 'server' : undefined,
          lastName: server.last_name ? 'server' : undefined,
          email: server.email ? 'server' : undefined,
          phone: server.phone ? 'server' : undefined,
          password: server.password ? 'server' : undefined,
          passwordConfirmation: server.password_confirmation ? 'server' : undefined,
        })
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
        className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
        onClick={() => setVisible(!visible)}
        type="button"
      >
        <EyeIcon visible={visible} />
      </button>
    )
  }

  return (
    <PublicLayout>
      <AuthShell layout="patient" spacious title={t('auth.registration.title')} subtitle={t('auth.registration.subtitle')} variant="registration">
        <form noValidate onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2 md:gap-x-4 md:gap-y-3">
            <InputField autoComplete="given-name" error={fieldError('firstName')} icon={<UserIcon />} id={fieldIds.firstName} label={t('auth.registration.firstNameLabel')} onBlur={handleBlur('firstName')} onChange={(event) => updateField('firstName', event.target.value)} placeholder={t('auth.registration.firstNamePlaceholder')} value={form.firstName} />
            <InputField autoComplete="family-name" error={fieldError('lastName')} icon={<UserIcon />} id={fieldIds.lastName} label={t('auth.registration.lastNameLabel')} onBlur={handleBlur('lastName')} onChange={(event) => updateField('lastName', event.target.value)} placeholder={t('auth.registration.lastNamePlaceholder')} value={form.lastName} />
            <InputField autoComplete="email" className="direction-ltr" error={fieldError('email')} icon={<MailIcon />} id={fieldIds.email} inputMode="email" label={t('auth.registration.emailLabel')} onBlur={handleBlur('email')} onChange={(event) => updateField('email', event.target.value)} placeholder={t('auth.registration.emailPlaceholder')} type="email" value={form.email} />
            <InputField autoComplete="tel" className="direction-ltr" error={fieldError('phone')} icon={<PhoneIcon />} id={fieldIds.phone} inputMode="tel" label={t('auth.registration.phoneLabel')} onBlur={handleBlur('phone')} onChange={(event) => updateField('phone', event.target.value)} placeholder={t('auth.registration.phonePlaceholder')} type="tel" value={form.phone} />
            <InputField autoComplete="new-password" endAdornment={passwordToggle(passwordVisible, setPasswordVisible)} error={fieldError('password')} icon={<LockIcon />} id={fieldIds.password} label={t('auth.registration.passwordLabel')} onBlur={handleBlur('password')} onChange={(event) => updateField('password', event.target.value)} placeholder={t('auth.registration.passwordPlaceholder')} type={passwordVisible ? 'text' : 'password'} value={form.password} />
            <InputField autoComplete="new-password" endAdornment={passwordToggle(confirmationVisible, setConfirmationVisible)} error={fieldError('passwordConfirmation')} icon={<LockIcon />} id={fieldIds.passwordConfirmation} label={t('auth.registration.passwordConfirmationLabel')} onBlur={handleBlur('passwordConfirmation')} onChange={(event) => updateField('passwordConfirmation', event.target.value)} placeholder={t('auth.registration.passwordConfirmationPlaceholder')} type={confirmationVisible ? 'text' : 'password'} value={form.passwordConfirmation} />
          </div>
          <div className="mt-2.5">
            <ProfilePhotoField compact error={profilePhotoError} file={profilePhoto} onChange={handlePhoto} />
          </div>

          <div className="mt-1.5 min-h-5" aria-live="polite">
            {statusMessage && (
              <p className="auth-field-error px-1">{t(statusMessage)}</p>
            )}
          </div>

          <div className="mx-auto mt-1.5 max-w-xl">
            <PrimaryButton disabled={isSubmitting} type="submit">
              {isSubmitting && <span aria-hidden="true" className="auth-spinner" />}
              {t(isSubmitting ? 'auth.registration.submitting' : 'auth.registration.submit')}
            </PrimaryButton>
            <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
              {t('auth.registration.haveAccount')}{' '}
              <Link className="font-bold text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" to={{ pathname: '/login', search: location.search }}>
                {t('auth.registration.signIn')}
              </Link>
            </p>
          </div>
        </form>
      </AuthShell>
    </PublicLayout>
  )
}
