import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { ProfileAvatar } from '../../components/branding/ProfileAvatar'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { SelectField } from '../../components/forms/SelectField'
import { EyeIcon, LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { LocationIcon } from '../../components/icons/PatientHomeIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, registerLaboratory, type RegistrationOption } from '../../services/authService'
import { isValidEmail, isValidPhone, isValidRegistrationPassword, laravelFieldErrors, profilePhotoIssue } from '../../utils/authValidation'

const OTHER_CITY = '__other__'
const TOTAL_STEPS = 3
const emptyForm = {
  laboratoryName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  location: '',
  proposedCity: '',
  address: '',
}

type LabForm = typeof emptyForm
type LabStep = 1 | 2 | 3
type LabField = 'laboratoryName' | 'email' | 'phone' | 'password' | 'passwordConfirmation' | 'location' | 'proposedCity' | 'address'
type FieldErrors = Partial<Record<LabField, string>>

const stepLabels = ['account', 'details', 'review'] as const
const accountApiFields = ['laboratory_name', 'email', 'phone', 'password', 'password_confirmation']
const fieldIds: Record<LabField, string> = {
  laboratoryName: 'lab-name',
  email: 'lab-email',
  phone: 'lab-phone',
  password: 'lab-password',
  passwordConfirmation: 'lab-password-confirmation',
  location: 'lab-location',
  proposedCity: 'lab-proposed-city',
  address: 'lab-address',
}

export function LaboratoryRegistrationPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<LabStep>(1)
  const [form, setForm] = useState(emptyForm)
  const [locations, setLocations] = useState<RegistrationOption[]>([])
  const [optionsAttempt, setOptionsAttempt] = useState(0)
  const [status, setStatus] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoError, setProfilePhotoError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getDoctorRegistrationOptions(controller.signal)
      .then((value) => {
        setLocations(value.locations)
        setStatus((current) => current === 'auth.laboratoryRegistration.optionsError' ? '' : current)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('auth.laboratoryRegistration.optionsError')
      })
    return () => controller.abort()
  }, [optionsAttempt])

  const update = (field: keyof LabForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus('')
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function accountFieldError(field: LabField, values: LabForm = form): string | undefined {
    const value = values[field]
    if (field === 'laboratoryName') return value.trim() ? undefined : 'required'
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

  function validateAccount(): FieldErrors {
    const next: FieldErrors = {}
    ;(['laboratoryName', 'email', 'phone', 'password', 'passwordConfirmation'] as const).forEach((field) => {
      const code = accountFieldError(field)
      if (code) next[field] = code
    })
    return next
  }

  function validateDetails(): FieldErrors {
    const next: FieldErrors = {}
    if (!form.location) next.location = 'required'
    if (form.location === OTHER_CITY && !form.proposedCity.trim()) next.proposedCity = 'required'
    if (!form.address.trim() || form.address.trim().length < 4) next.address = 'required'
    const photoIssue = profilePhotoIssue(profilePhoto, false)
    if (photoIssue) setProfilePhotoError(t(`profilePhoto.${photoIssue}`))
    else setProfilePhotoError('')
    return next
  }

  function focusField(errors: FieldErrors) {
    const first = (Object.keys(fieldIds) as LabField[]).find((field) => errors[field])
    if (first) document.getElementById(fieldIds[first])?.focus()
  }

  function displayAccountError(field: 'email' | 'phone' | 'password' | 'passwordConfirmation') {
    const code = fieldErrors[field]
    return code ? t(`auth.registration.errors.${field}.${code}`) : undefined
  }

  const localized = (option: RegistrationOption) => (i18n.language.startsWith('ar') ? option.name_ar : option.name_en)
  const locationLabel = form.location === OTHER_CITY
    ? form.proposedCity
    : (locations.find((option) => option.code === form.location) ? localized(locations.find((option) => option.code === form.location) as RegistrationOption) : form.location)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === 1) {
      const accountErrors = validateAccount()
      setFieldErrors(accountErrors)
      if (Object.keys(accountErrors).length > 0) {
        setStatus('auth.registration.errors.correctFields')
        focusField(accountErrors)
        return
      }
      setStatus('')
      setStep(2)
      return
    }

    if (step === 2) {
      const detailErrors = validateDetails()
      setFieldErrors((current) => ({ ...current, ...detailErrors }))
      if (Object.keys(detailErrors).length > 0 || profilePhotoIssue(profilePhoto, false)) {
        setStatus('auth.registration.errors.correctFields')
        focusField(detailErrors)
        return
      }
      setStatus('')
      setStep(3)
      return
    }

    const accountErrors = validateAccount()
    const detailErrors = validateDetails()
    if (Object.keys(accountErrors).length > 0) {
      setFieldErrors(accountErrors)
      setStep(1)
      focusField(accountErrors)
      return
    }
    if (Object.keys(detailErrors).length > 0) {
      setFieldErrors(detailErrors)
      setStep(2)
      focusField(detailErrors)
      return
    }

    setSubmitting(true)
    try {
      await registerLaboratory({
        laboratory_name: form.laboratoryName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        ...(form.location === OTHER_CITY ? { proposed_city: form.proposedCity.trim() } : { location: form.location }),
        address: form.address.trim(),
        profile_photo: profilePhoto,
      })
      navigate('/verify-email', { replace: true, state: { email: form.email.trim(), role: 'laboratory' } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const server = laravelFieldErrors(error.details)
        setFieldErrors({
          laboratoryName: server.laboratory_name ? 'server' : undefined,
          email: server.email ? 'server' : undefined,
          phone: server.phone ? 'server' : undefined,
          password: server.password ? 'server' : undefined,
          passwordConfirmation: server.password_confirmation ? 'server' : undefined,
          location: server.location ? 'required' : undefined,
          proposedCity: server.proposed_city ? 'required' : undefined,
          address: server.address ? 'required' : undefined,
        })
        setProfilePhotoError(server.profile_photo ? t('profilePhoto.invalid') : '')
        setStatus('auth.laboratoryRegistration.invalid')
        const fields = Object.keys(server)
        setStep(fields.some((field) => accountApiFields.includes(field)) ? 1 : 2)
      } else {
        setStatus('auth.laboratoryRegistration.serviceError')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = 'grid gap-3 md:grid-cols-2 md:gap-x-4 md:gap-y-3'
  const passwordToggle = (visible: boolean, toggle: () => void) => (
    <button
      aria-label={t(visible ? 'auth.registration.hidePassword' : 'auth.registration.showPassword')}
      className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
      onClick={toggle}
      type="button"
    >
      <EyeIcon visible={visible} />
    </button>
  )

  return (
    <PublicLayout>
      <AuthShell eyebrow={t('auth.laboratoryRegistration.eyebrow')} spacious title={t('auth.laboratoryRegistration.title')} subtitle={t('auth.laboratoryRegistration.subtitle')} variant="registration">
        <LabRegistrationStepper current={step} />
        <form noValidate onSubmit={handleSubmit}>
          <div className="auth-step-panel" key={step}>
            {step === 1 && (
              <div className={fieldClass}>
                <div className="md:col-span-2">
                  <InputField error={fieldErrors.laboratoryName ? t('auth.laboratoryRegistration.required') : undefined} icon={<UserIcon />} id="lab-name" label={t('auth.laboratoryRegistration.nameLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, laboratoryName: accountFieldError('laboratoryName') }))} onChange={(event) => update('laboratoryName', event.target.value)} value={form.laboratoryName} />
                </div>
                <InputField className="direction-ltr" error={displayAccountError('email')} icon={<MailIcon />} id="lab-email" label={t('auth.registration.emailLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, email: accountFieldError('email') }))} onChange={(event) => update('email', event.target.value)} type="email" value={form.email} />
                <InputField className="direction-ltr" error={displayAccountError('phone')} icon={<PhoneIcon />} id="lab-phone" label={t('auth.registration.phoneLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, phone: accountFieldError('phone') }))} onChange={(event) => update('phone', event.target.value)} type="tel" value={form.phone} />
                <InputField autoComplete="new-password" endAdornment={passwordToggle(passwordVisible, () => setPasswordVisible((value) => !value))} error={displayAccountError('password')} icon={<LockIcon />} id="lab-password" label={t('auth.registration.passwordLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, password: accountFieldError('password') }))} onChange={(event) => update('password', event.target.value)} type={passwordVisible ? 'text' : 'password'} value={form.password} />
                <InputField autoComplete="new-password" endAdornment={passwordToggle(confirmationVisible, () => setConfirmationVisible((value) => !value))} error={displayAccountError('passwordConfirmation')} icon={<LockIcon />} id="lab-password-confirmation" label={t('auth.registration.passwordConfirmationLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, passwordConfirmation: accountFieldError('passwordConfirmation') }))} onChange={(event) => update('passwordConfirmation', event.target.value)} type={confirmationVisible ? 'text' : 'password'} value={form.passwordConfirmation} />
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-2.5">
                <SelectField error={fieldErrors.location ? t('auth.laboratoryRegistration.required') : undefined} icon={<LocationIcon className="size-6" />} id="lab-location" label={t('auth.laboratoryRegistration.location')} onChange={(event) => update('location', event.target.value)} options={[{ value: '', label: t('auth.laboratoryRegistration.chooseLocation') }, ...locations.map((option) => ({ value: option.code, label: localized(option) })), { value: OTHER_CITY, label: t('auth.laboratoryRegistration.otherCity') }]} value={form.location} variant="auth" />
                {form.location === OTHER_CITY && (
                  <InputField error={fieldErrors.proposedCity ? t('auth.laboratoryRegistration.required') : undefined} icon={<LocationIcon className="size-6" />} id="lab-proposed-city" label={t('auth.laboratoryRegistration.proposedCity')} onChange={(event) => update('proposedCity', event.target.value)} placeholder={t('auth.laboratoryRegistration.proposedCityPlaceholder')} value={form.proposedCity} />
                )}
                <InputField error={fieldErrors.address ? t('auth.laboratoryRegistration.required') : undefined} icon={<LocationIcon className="size-6" />} id="lab-address" label={t('auth.laboratoryRegistration.address')} onChange={(event) => update('address', event.target.value)} placeholder={t('auth.laboratoryRegistration.addressPlaceholder')} value={form.address} />
                <ProfilePhotoField compact error={profilePhotoError} file={profilePhoto} onChange={(file) => { const issue = profilePhotoIssue(file, false); setProfilePhoto(issue === 'invalid' ? null : file); setProfilePhotoError(issue ? t(`profilePhoto.${issue}`) : '') }} />
                <p className="text-xs text-[var(--color-text-secondary)]">{t('auth.laboratoryRegistration.cityReviewNote')}</p>
              </div>
            )}

            {step === 3 && (
              <LabRegistrationReview form={form} locationLabel={locationLabel} onEdit={setStep} photo={profilePhoto} />
            )}
          </div>

          <p aria-live="polite" className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {status ? t(status) : t('auth.laboratoryRegistration.verificationNote')}
          </p>
          {status === 'auth.laboratoryRegistration.optionsError' && (
            <button className="mt-2 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => setOptionsAttempt((value) => value + 1)} type="button">
              {t('auth.laboratoryRegistration.retry')}
            </button>
          )}

          <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 1 ? (
              <button className="inline-flex min-h-12 items-center justify-center rounded-full px-5 font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" onClick={() => setStep((current) => (current === 3 ? 2 : 1))} type="button">
                {t('auth.laboratoryRegistration.back')}
              </button>
            ) : (
              <span />
            )}
            <div className="sm:min-w-52 sm:max-w-xs sm:flex-1">
              <PrimaryButton disabled={submitting} type="submit">
                {submitting && <span aria-hidden="true" className="auth-spinner" />}
                {step === 3
                  ? t(submitting ? 'auth.laboratoryRegistration.submitting' : 'auth.laboratoryRegistration.submit')
                  : t('auth.laboratoryRegistration.continue')}
              </PrimaryButton>
            </div>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
          {t('auth.registration.haveAccount')}{' '}
          <Link className="font-bold text-[var(--color-primary)] hover:underline" to="/login">{t('auth.registration.signIn')}</Link>
        </p>
      </AuthShell>
    </PublicLayout>
  )
}

function LabRegistrationStepper({ current }: { current: LabStep }) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('auth.laboratoryRegistration.steps.label')} className="auth-stepper-nav">
      <ol className="auth-stepper">
        {stepLabels.map((key, index) => {
          const number = (index + 1) as LabStep
          return (
            <li className={`auth-stepper__step${number < current ? ' is-complete' : ''}${number === current ? ' is-current' : ''}`} key={key}>
              <span className="auth-stepper__marker">{number < current ? '✓' : number}</span>
              <span aria-current={number === current ? 'step' : undefined} className="auth-stepper__label">
                {t(`auth.laboratoryRegistration.steps.${key}`)}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="auth-stepper-mobile">
        <div aria-hidden="true" className="auth-stepper-mobile__track">
          {stepLabels.map((key, index) => (
            <span className="contents" key={key}>
              <span className={`auth-stepper-mobile__dot${index + 1 === current ? ' is-active' : ''}${index + 1 < current ? ' is-complete' : ''}`} />
              {index < stepLabels.length - 1 && <span className={`auth-stepper-mobile__line${index + 1 < current ? ' is-complete' : ''}`} />}
            </span>
          ))}
        </div>
        <p className="auth-stepper-mobile__meta">{t('auth.laboratoryRegistration.steps.of', { current, total: TOTAL_STEPS })}</p>
        <p aria-current="step" className="auth-stepper-mobile__title">{t(`auth.laboratoryRegistration.steps.${stepLabels[current - 1]}`)}</p>
      </div>
    </nav>
  )
}

function LabRegistrationReview({ form, locationLabel, onEdit, photo }: { form: LabForm; locationLabel: string; onEdit: (step: LabStep) => void; photo: File | null }) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2.5">
      <ReviewSection onEdit={() => onEdit(1)} title={t('auth.laboratoryRegistration.review.account')}>
        <ReviewRow label={t('auth.laboratoryRegistration.nameLabel')} value={form.laboratoryName} />
        <ReviewRow label={t('auth.registration.emailLabel')} value={form.email} />
        <ReviewRow label={t('auth.registration.phoneLabel')} value={form.phone} />
      </ReviewSection>
      <ReviewSection onEdit={() => onEdit(2)} title={t('auth.laboratoryRegistration.review.location')}>
        <ReviewRow label={t('auth.laboratoryRegistration.location')} value={locationLabel} />
        <ReviewRow label={t('auth.laboratoryRegistration.address')} value={form.address} />
      </ReviewSection>
      <ReviewSection onEdit={() => onEdit(2)} title={t('auth.laboratoryRegistration.review.profile')}>
        {photo ? <LabPhotoPreview file={photo} name={form.laboratoryName} /> : <p className="text-sm text-[var(--color-text-secondary)]">{t('profilePhoto.optionalLabel')}</p>}
      </ReviewSection>
    </div>
  )
}

function ReviewSection({ children, onEdit, title }: { children: ReactNode; onEdit: () => void; title: string }) {
  const { t } = useTranslation()
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-[var(--color-primary)]">{title}</h2>
        <button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={onEdit} type="button">{t('auth.laboratoryRegistration.edit')}</button>
      </div>
      <dl className="grid gap-2">{children}</dl>
    </section>
  )
}

function LabPhotoPreview({ file, name }: { file: File; name: string }) {
  const { t } = useTranslation()
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])
  return <ProfileAvatar alt={t('profilePhoto.previewAlt')} className="size-20 rounded-2xl text-xl shadow-sm" imageUrl={previewUrl} name={name} />
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-semibold text-[var(--color-text-primary)]">{value}</dd>
    </div>
  )
}
