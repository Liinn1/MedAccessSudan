import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { SelectField } from '../../components/forms/SelectField'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ProfileAvatar } from '../../components/branding/ProfileAvatar'
import { EyeIcon, LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, registerDoctor, type RegistrationOption } from '../../services/authService'
import { isValidEmail, isValidPhone, isValidRegistrationPassword, laravelFieldErrors, profilePhotoIssue } from '../../utils/authValidation'

const OTHER_CITY = '__other__'
const TOTAL_STEPS = 3
const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  specialization: '',
  location: '',
  proposedCity: '',
  clinicName: '',
  offersClinic: true,
  offersHome: false,
}

type DoctorForm = typeof emptyForm
type DoctorStep = 1 | 2 | 3
type DoctorField = 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'passwordConfirmation' | 'specialization' | 'location' | 'proposedCity'
type FieldErrors = Partial<Record<DoctorField, string>>

const stepLabels = ['account', 'professional', 'review'] as const
const accountApiFields = ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirmation']
const fieldIds: Record<DoctorField, string> = {
  firstName: 'doctor-first-name',
  lastName: 'doctor-last-name',
  email: 'doctor-email',
  phone: 'doctor-phone',
  password: 'doctor-password',
  passwordConfirmation: 'doctor-password-confirmation',
  specialization: 'doctor-specialization',
  location: 'doctor-location',
  proposedCity: 'doctor-proposed-city',
}

export function DoctorRegistrationPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<DoctorStep>(1)
  const [form, setForm] = useState(emptyForm)
  const [options, setOptions] = useState<{ specializations: RegistrationOption[]; locations: RegistrationOption[] }>({ specializations: [], locations: [] })
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
        setOptions(value)
        setStatus((current) => current === 'auth.doctorRegistration.optionsError' ? '' : current)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('auth.doctorRegistration.optionsError')
      })

    return () => controller.abort()
  }, [optionsAttempt])

  const update = (field: keyof DoctorForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus('')
    if (field in fieldIds) setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function accountFieldError(field: DoctorField, values: DoctorForm = form): string | undefined {
    const value = field === 'firstName' || field === 'lastName' || field === 'email' || field === 'phone' || field === 'password' || field === 'passwordConfirmation' ? values[field] : ''
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

  function validateAccount(): FieldErrors {
    const next: FieldErrors = {}
    ;(['firstName', 'lastName', 'email', 'phone', 'password', 'passwordConfirmation'] as const).forEach((field) => {
      const code = accountFieldError(field)
      if (code) next[field] = code
    })
    return next
  }

  function validateProfessional(): FieldErrors {
    const next: FieldErrors = {}
    if (!form.specialization) next.specialization = 'required'
    if (!form.location) next.location = 'required'
    if (form.location === OTHER_CITY && !form.proposedCity.trim()) next.proposedCity = 'required'
    const photoIssue = profilePhotoIssue(profilePhoto, true)
    if (photoIssue) setProfilePhotoError(t(`profilePhoto.${photoIssue}`))
    else setProfilePhotoError('')
    return next
  }

  function focusField(errors: FieldErrors) {
    const first = (Object.keys(fieldIds) as DoctorField[]).find((field) => errors[field])
    if (first) document.getElementById(fieldIds[first])?.focus()
  }

  function displayFieldError(field: DoctorField, group: 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'passwordConfirmation') {
    const code = fieldErrors[field]
    return code ? t(`auth.registration.errors.${group}.${code}`) : undefined
  }

  const localized = (option: RegistrationOption) => i18n.language.startsWith('ar') ? option.name_ar : option.name_en
  const optionLabel = (list: RegistrationOption[], code: string) => {
    const match = list.find((option) => option.code === code)
    return match ? localized(match) : code
  }

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
      const professionalErrors = validateProfessional()
      setFieldErrors((current) => ({ ...current, ...professionalErrors }))
      if (!form.offersClinic && !form.offersHome) {
        setStatus('auth.doctorRegistration.consultationRequired')
        return
      }
      if (Object.keys(professionalErrors).length > 0 || profilePhotoIssue(profilePhoto, true)) {
        setStatus('auth.registration.errors.correctFields')
        focusField(professionalErrors)
        return
      }
      setStatus('')
      setStep(3)
      return
    }

    const accountErrors = validateAccount()
    if (Object.keys(accountErrors).length > 0) {
      setFieldErrors(accountErrors)
      setStatus('auth.registration.errors.correctFields')
      setStep(1)
      return
    }
    const professionalErrors = validateProfessional()
    if (Object.keys(professionalErrors).length > 0 || profilePhotoIssue(profilePhoto, true) || (!form.offersClinic && !form.offersHome)) {
      setFieldErrors(professionalErrors)
      setStatus(!form.offersClinic && !form.offersHome ? 'auth.doctorRegistration.consultationRequired' : 'auth.registration.errors.correctFields')
      setStep(2)
      return
    }

    setSubmitting(true)
    try {
      await registerDoctor({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        specialization: form.specialization,
        ...(form.location === OTHER_CITY ? { proposed_city: form.proposedCity.trim() } : { location: form.location }),
        clinic_name: form.offersClinic ? form.clinicName : '',
        offers_clinic_visits: form.offersClinic,
        offers_home_visits: form.offersHome,
        profile_photo: profilePhoto as File,
      })
      navigate('/verify-email', { replace: true, state: { email: form.email.trim(), role: 'doctor' } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const server = laravelFieldErrors(error.details)
        setFieldErrors({
          firstName: server.first_name ? 'server' : undefined,
          lastName: server.last_name ? 'server' : undefined,
          email: server.email ? 'server' : undefined,
          phone: server.phone ? 'server' : undefined,
          password: server.password ? 'server' : undefined,
          passwordConfirmation: server.password_confirmation ? 'server' : undefined,
          specialization: server.specialization ? 'server' : undefined,
          location: server.location ? 'server' : undefined,
          proposedCity: server.proposed_city ? 'server' : undefined,
        })
        setProfilePhotoError(server.profile_photo ? t('profilePhoto.invalid') : '')
        setStatus('auth.doctorRegistration.invalid')
        setStep(stepForBackendError(error))
      } else {
        setStatus('auth.doctorRegistration.serviceError')
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
      <AuthShell eyebrow={t('auth.doctorRegistration.eyebrow')} spacious title={t('auth.doctorRegistration.title')} subtitle={t('auth.doctorRegistration.subtitle')} variant="registration">
        <DoctorRegistrationStepper current={step} />
        <form noValidate onSubmit={handleSubmit}>
          <div className="auth-step-panel" key={step}>
            {step === 1 && (
              <div className={fieldClass}>
                <InputField id="doctor-first-name" error={displayFieldError('firstName', 'firstName')} icon={<UserIcon />} label={t('auth.registration.firstNameLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, firstName: accountFieldError('firstName') }))} onChange={(event) => update('firstName', event.target.value)} value={form.firstName} />
                <InputField id="doctor-last-name" error={displayFieldError('lastName', 'lastName')} icon={<UserIcon />} label={t('auth.registration.lastNameLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, lastName: accountFieldError('lastName') }))} onChange={(event) => update('lastName', event.target.value)} value={form.lastName} />
                <InputField className="direction-ltr" id="doctor-email" error={displayFieldError('email', 'email')} icon={<MailIcon />} label={t('auth.registration.emailLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, email: accountFieldError('email') }))} onChange={(event) => update('email', event.target.value)} type="email" value={form.email} />
                <InputField className="direction-ltr" id="doctor-phone" error={displayFieldError('phone', 'phone')} icon={<PhoneIcon />} label={t('auth.registration.phoneLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, phone: accountFieldError('phone') }))} onChange={(event) => update('phone', event.target.value)} type="tel" value={form.phone} />
                <InputField autoComplete="new-password" endAdornment={passwordToggle(passwordVisible, () => setPasswordVisible((value) => !value))} error={displayFieldError('password', 'password')} id="doctor-password" icon={<LockIcon />} label={t('auth.registration.passwordLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, password: accountFieldError('password') }))} onChange={(event) => update('password', event.target.value)} type={passwordVisible ? 'text' : 'password'} value={form.password} />
                <InputField autoComplete="new-password" endAdornment={passwordToggle(confirmationVisible, () => setConfirmationVisible((value) => !value))} error={displayFieldError('passwordConfirmation', 'passwordConfirmation')} id="doctor-password-confirmation" icon={<LockIcon />} label={t('auth.registration.passwordConfirmationLabel')} onBlur={() => setFieldErrors((current) => ({ ...current, passwordConfirmation: accountFieldError('passwordConfirmation') }))} onChange={(event) => update('passwordConfirmation', event.target.value)} type={confirmationVisible ? 'text' : 'password'} value={form.passwordConfirmation} />
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-2.5">
                <section>
                  <h2 className="mb-1.5 text-sm font-extrabold text-[var(--color-primary)]">{t('auth.doctorRegistration.groups.professional')}</h2>
                  <div className={fieldClass}>
                    <SelectField error={fieldErrors.specialization ? t('auth.doctorRegistration.required') : undefined} id="doctor-specialization" icon={<UserIcon />} label={t('auth.doctorRegistration.specialization')} onChange={(event) => update('specialization', event.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseSpecialization') }, ...options.specializations.map((option) => ({ value: option.code, label: localized(option) }))]} value={form.specialization} variant="auth" />
                    <SelectField error={fieldErrors.location ? t('auth.doctorRegistration.required') : undefined} id="doctor-location" icon={<UserIcon />} label={t('auth.doctorRegistration.location')} onChange={(event) => update('location', event.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseLocation') }, ...options.locations.map((option) => ({ value: option.code, label: localized(option) })), { value: OTHER_CITY, label: t('auth.doctorRegistration.otherCity') }]} value={form.location} variant="auth" />
                    {form.location === OTHER_CITY && (
                      <div className="md:col-span-2">
                        <InputField error={fieldErrors.proposedCity ? t('auth.doctorRegistration.required') : undefined} id="doctor-proposed-city" icon={<UserIcon />} label={t('auth.doctorRegistration.proposedCity')} onChange={(event) => update('proposedCity', event.target.value)} placeholder={t('auth.doctorRegistration.proposedCityPlaceholder')} value={form.proposedCity} />
                      </div>
                    )}
                    <div className={form.offersClinic ? '' : 'md:col-span-2'}>
                      <ProfilePhotoField error={profilePhotoError} file={profilePhoto} onChange={(file) => { const issue = profilePhotoIssue(file, true); setProfilePhoto(issue === 'invalid' ? null : file); setProfilePhotoError(issue ? t(`profilePhoto.${issue}`) : '') }} compact required />
                    </div>
                    {form.offersClinic && (
                      <InputField id="doctor-clinic" icon={<UserIcon />} label={t('auth.doctorRegistration.clinic')} onChange={(event) => update('clinicName', event.target.value)} value={form.clinicName} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('auth.doctorRegistration.cityReviewNote')}</p>
                </section>
                <section>
                  <h2 className="mb-1.5 text-sm font-extrabold text-[var(--color-primary)]">{t('auth.doctorRegistration.groups.availability')}</h2>
                  <fieldset className="rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2">
                    <legend className="px-1 text-sm font-bold text-[var(--color-text-primary)]">{t('auth.doctorRegistration.consultationTitle')}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex min-h-10 items-center gap-3 font-semibold">
                        <input checked={form.offersClinic} className="size-5 accent-[var(--color-primary)]" onChange={(event) => { setForm((current) => ({ ...current, offersClinic: event.target.checked })); setStatus('') }} type="checkbox" />
                        {t('auth.doctorRegistration.clinicVisits')}
                      </label>
                      <label className="flex min-h-10 items-center gap-3 font-semibold">
                        <input checked={form.offersHome} className="size-5 accent-[var(--color-primary)]" onChange={(event) => { setForm((current) => ({ ...current, offersHome: event.target.checked })); setStatus('') }} type="checkbox" />
                        {t('auth.doctorRegistration.homeVisits')}
                      </label>
                    </div>
                  </fieldset>
                </section>
              </div>
            )}

            {step === 3 && (
              <DoctorRegistrationReview
                form={form}
                locationLabel={form.location === OTHER_CITY ? form.proposedCity : optionLabel(options.locations, form.location)}
                onEdit={setStep}
                photo={profilePhoto}
                specializationLabel={optionLabel(options.specializations, form.specialization)}
              />
            )}
          </div>

          <p aria-live="polite" className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {status ? t(status) : t('auth.doctorRegistration.verificationNote')}
          </p>
          {status === 'auth.doctorRegistration.optionsError' && (
            <button className="mt-2 text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={() => setOptionsAttempt((value) => value + 1)} type="button">
              {t('auth.doctorRegistration.retry')}
            </button>
          )}

          <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 1 ? (
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full px-5 font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                type="button"
              >
                {t('auth.doctorRegistration.back')}
              </button>
            ) : (
              <span />
            )}
            <div className="sm:min-w-52 sm:max-w-xs sm:flex-1">
              <PrimaryButton disabled={submitting} type="submit">
                {submitting && <span aria-hidden="true" className="auth-spinner" />}
                {step === 3
                  ? t(submitting ? 'auth.doctorRegistration.submitting' : 'auth.doctorRegistration.submit')
                  : t('auth.doctorRegistration.continue')}
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

function DoctorRegistrationStepper({ current }: { current: DoctorStep }) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('auth.doctorRegistration.steps.label')} className="auth-stepper-nav">
      <ol className="auth-stepper">
        {stepLabels.map((key, index) => {
          const number = (index + 1) as DoctorStep
          const complete = number < current
          const active = number === current
          return (
            <li className={`auth-stepper__step${complete ? ' is-complete' : ''}${active ? ' is-current' : ''}`} key={key}>
              <span className="auth-stepper__marker">{complete ? '✓' : number}</span>
              <span aria-current={active ? 'step' : undefined} className="auth-stepper__label">
                {t(`auth.doctorRegistration.steps.${key}`)}
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
              {index < stepLabels.length - 1 && (
                <span className={`auth-stepper-mobile__line${index + 1 < current ? ' is-complete' : ''}`} />
              )}
            </span>
          ))}
        </div>
        <p className="auth-stepper-mobile__meta">
          {t('auth.doctorRegistration.steps.of', { current, total: TOTAL_STEPS })}
        </p>
        <p aria-current="step" className="auth-stepper-mobile__title">
          {t(`auth.doctorRegistration.steps.${stepLabels[current - 1]}`)}
        </p>
      </div>
    </nav>
  )
}

function DoctorRegistrationReview({
  form,
  locationLabel,
  onEdit,
  photo,
  specializationLabel,
}: {
  form: DoctorForm
  locationLabel: string
  onEdit: (step: DoctorStep) => void
  photo: File | null
  specializationLabel: string
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2.5">
      <ReviewSection onEdit={() => onEdit(1)} title={t('auth.doctorRegistration.review.account')}>
        <ReviewRow label={t('auth.registration.firstNameLabel')} value={`${form.firstName} ${form.lastName}`.trim()} />
        <ReviewRow label={t('auth.registration.emailLabel')} value={form.email} />
        <ReviewRow label={t('auth.registration.phoneLabel')} value={form.phone} />
      </ReviewSection>
      <ReviewSection onEdit={() => onEdit(2)} title={t('auth.doctorRegistration.review.professional')}>
        <ReviewRow label={t('auth.doctorRegistration.specialization')} value={specializationLabel} />
        <ReviewRow label={t('auth.doctorRegistration.location')} value={locationLabel} />
      </ReviewSection>
      <ReviewSection onEdit={() => onEdit(2)} title={t('auth.doctorRegistration.review.care')}>
        <ReviewRow label={t('auth.doctorRegistration.clinicVisits')} value={t(form.offersClinic ? 'auth.doctorRegistration.review.yes' : 'auth.doctorRegistration.review.no')} />
        <ReviewRow label={t('auth.doctorRegistration.homeVisits')} value={t(form.offersHome ? 'auth.doctorRegistration.review.yes' : 'auth.doctorRegistration.review.no')} />
        {form.offersClinic && <ReviewRow label={t('auth.doctorRegistration.clinic')} value={form.clinicName || '—'} />}
      </ReviewSection>
      <ReviewSection onEdit={() => onEdit(2)} title={t('auth.doctorRegistration.review.profile')}>
        {photo ? (
          <DoctorPhotoPreview file={photo} name={`${form.firstName} ${form.lastName}`.trim()} />
        ) : (
          <p className="text-sm text-red-700">{t('profilePhoto.required')}</p>
        )}
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
        <button className="text-sm font-bold text-[var(--color-primary)] hover:underline" onClick={onEdit} type="button">
          {t('auth.doctorRegistration.edit')}
        </button>
      </div>
      <dl className="grid gap-2">{children}</dl>
    </section>
  )
}

function DoctorPhotoPreview({ file, name }: { file: File; name: string }) {
  const { t } = useTranslation()
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  return (
    <ProfileAvatar
      alt={t('profilePhoto.previewAlt')}
      className="size-20 rounded-2xl text-xl shadow-sm"
      imageUrl={previewUrl}
      name={name}
    />
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="font-semibold text-[var(--color-text-primary)]">{value}</dd>
    </div>
  )
}

/** Laravel 422 keys use snake_case; account fields send the user back to step 1. */
function stepForBackendError(error: ApiError): DoctorStep {
  if (typeof error.details !== 'object' || error.details === null || !('errors' in error.details)) return 2
  const errors = error.details.errors
  if (typeof errors !== 'object' || errors === null) return 2
  const fields = Object.keys(errors)
  if (fields.some((field) => accountApiFields.includes(field))) return 1
  return 2
}
