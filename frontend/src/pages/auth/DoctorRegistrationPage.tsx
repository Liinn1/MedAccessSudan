import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { SelectField } from '../../components/forms/SelectField'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { EyeIcon, LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, registerDoctor, type RegistrationOption } from '../../services/authService'

const OTHER_CITY = '__other__'
const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirmation: '', specialization: '', location: '', proposedCity: '', clinicName: '', offersClinic: true, offersHome: false }

export function DoctorRegistrationPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [options, setOptions] = useState<{ specializations: RegistrationOption[]; locations: RegistrationOption[] }>({ specializations: [], locations: [] })
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoError, setProfilePhotoError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getDoctorRegistrationOptions(controller.signal).then(setOptions).catch(() => setStatus('auth.doctorRegistration.optionsError'))
    return () => controller.abort()
  }, [])

  const update = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setStatus('') }
  const localized = (option: RegistrationOption) => i18n.language.startsWith('ar') ? option.name_ar : option.name_en

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.passwordConfirmation || !form.specialization || !form.location || (form.location === OTHER_CITY && !form.proposedCity.trim()) || !profilePhoto || (!form.offersClinic && !form.offersHome)) {
      if (!profilePhoto) setProfilePhotoError(t('profilePhoto.required'))
      if (!form.offersClinic && !form.offersHome) setStatus('auth.doctorRegistration.consultationRequired')
      else setStatus('auth.doctorRegistration.required'); return
    }
    if (form.password !== form.passwordConfirmation) { setStatus('auth.doctorRegistration.passwordMismatch'); return }
    setSubmitting(true)
    try {
      await registerDoctor({ first_name: form.firstName, last_name: form.lastName, email: form.email, phone: form.phone, password: form.password, password_confirmation: form.passwordConfirmation, specialization: form.specialization, ...(form.location === OTHER_CITY ? { proposed_city: form.proposedCity.trim() } : { location: form.location }), clinic_name: form.offersClinic ? form.clinicName : '', offers_clinic_visits: form.offersClinic, offers_home_visits: form.offersHome, profile_photo: profilePhoto })
      navigate('/login', { replace: true, state: { registrationSuccess: true, registrationRole: 'doctor' } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setProfilePhotoError(t('profilePhoto.invalid'))
      setStatus(error instanceof ApiError && error.status === 422 ? 'auth.doctorRegistration.invalid' : 'auth.doctorRegistration.serviceError')
    } finally { setSubmitting(false) }
  }

  const fieldClass = 'grid gap-3.5 md:grid-cols-2 md:gap-x-4'
  const passwordToggle = (visible: boolean, toggle: () => void) => <button aria-label={t(visible ? 'auth.registration.hidePassword' : 'auth.registration.showPassword')} className="shrink-0 rounded-full p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={toggle} type="button"><EyeIcon visible={visible} /></button>
  return (
    <PublicLayout>
      <AuthShell eyebrow={t('auth.doctorRegistration.eyebrow')} spacious title={t('auth.doctorRegistration.title')} subtitle={t('auth.doctorRegistration.subtitle')} variant="registration">
          <form noValidate onSubmit={submit}>
            <div className={fieldClass}>
              <InputField id="doctor-first-name" icon={<UserIcon />} label={t('auth.registration.firstNameLabel')} onChange={(e) => update('firstName', e.target.value)} value={form.firstName} />
              <InputField id="doctor-last-name" icon={<UserIcon />} label={t('auth.registration.lastNameLabel')} onChange={(e) => update('lastName', e.target.value)} value={form.lastName} />
              <InputField className="direction-ltr" id="doctor-email" icon={<MailIcon />} label={t('auth.registration.emailLabel')} onChange={(e) => update('email', e.target.value)} type="email" value={form.email} />
              <InputField className="direction-ltr" id="doctor-phone" icon={<PhoneIcon />} label={t('auth.registration.phoneLabel')} onChange={(e) => update('phone', e.target.value)} type="tel" value={form.phone} />
              <InputField autoComplete="new-password" endAdornment={passwordToggle(passwordVisible, () => setPasswordVisible((value) => !value))} id="doctor-password" icon={<LockIcon />} label={t('auth.registration.passwordLabel')} onChange={(e) => update('password', e.target.value)} type={passwordVisible ? 'text' : 'password'} value={form.password} />
              <InputField autoComplete="new-password" endAdornment={passwordToggle(confirmationVisible, () => setConfirmationVisible((value) => !value))} id="doctor-password-confirmation" icon={<LockIcon />} label={t('auth.registration.passwordConfirmationLabel')} onChange={(e) => update('passwordConfirmation', e.target.value)} type={confirmationVisible ? 'text' : 'password'} value={form.passwordConfirmation} />
              <SelectField id="doctor-specialization" icon={<UserIcon />} label={t('auth.doctorRegistration.specialization')} onChange={(e) => update('specialization', e.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseSpecialization') }, ...options.specializations.map((option) => ({ value: option.code, label: localized(option) }))]} value={form.specialization} variant="auth" />
              <SelectField id="doctor-location" icon={<UserIcon />} label={t('auth.doctorRegistration.location')} onChange={(e) => update('location', e.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseLocation') }, ...options.locations.map((option) => ({ value: option.code, label: localized(option) })), { value: OTHER_CITY, label: t('auth.doctorRegistration.otherCity') }]} value={form.location} variant="auth" />
              {form.location === OTHER_CITY && <InputField id="doctor-proposed-city" icon={<UserIcon />} label={t('auth.doctorRegistration.proposedCity')} onChange={(e) => update('proposedCity', e.target.value)} placeholder={t('auth.doctorRegistration.proposedCityPlaceholder')} value={form.proposedCity} />}
              <fieldset className="md:col-span-2 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
                <legend className="px-1 text-sm font-bold text-[var(--color-text-primary)]">{t('auth.doctorRegistration.consultationTitle')}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-3 font-semibold"><input checked={form.offersClinic} className="size-5 accent-[var(--color-primary)]" onChange={(event) => { setForm((current) => ({ ...current, offersClinic: event.target.checked })); setStatus('') }} type="checkbox" />{t('auth.doctorRegistration.clinicVisits')}</label>
                  <label className="flex items-center gap-3 font-semibold"><input checked={form.offersHome} className="size-5 accent-[var(--color-primary)]" onChange={(event) => { setForm((current) => ({ ...current, offersHome: event.target.checked })); setStatus('') }} type="checkbox" />{t('auth.doctorRegistration.homeVisits')}</label>
                </div>
              </fieldset>
              {form.offersClinic && <div className="md:col-span-2"><InputField id="doctor-clinic" icon={<UserIcon />} label={t('auth.doctorRegistration.clinic')} onChange={(e) => update('clinicName', e.target.value)} value={form.clinicName} /></div>}
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{t('auth.doctorRegistration.cityReviewNote')}</p>
            <div className="mt-4"><ProfilePhotoField error={profilePhotoError} file={profilePhoto} onChange={(file) => { setProfilePhoto(file); setProfilePhotoError('') }} compact required /></div>
            <p aria-live="polite" className="mt-3 min-h-8 rounded-xl bg-[var(--color-primary-surface)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">{status ? t(status) : t('auth.doctorRegistration.verificationNote')}</p>
            <div className="mx-auto mt-3 max-w-xl"><PrimaryButton disabled={submitting} type="submit">{submitting && <span aria-hidden="true" className="auth-spinner" />}{t(submitting ? 'auth.doctorRegistration.submitting' : 'auth.doctorRegistration.submit')}</PrimaryButton></div>
          </form>
          <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)]">{t('auth.registration.haveAccount')} <Link className="font-bold text-[var(--color-primary)] hover:underline" to="/login">{t('auth.registration.signIn')}</Link></p>
      </AuthShell>
    </PublicLayout>
  )
}
