import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PrimaryButton } from '../../components/buttons/PrimaryButton'
import { InputField } from '../../components/forms/InputField'
import { SelectField } from '../../components/forms/SelectField'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { LockIcon, MailIcon, PhoneIcon, UserIcon } from '../../components/icons/AuthIcons'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, registerDoctor, type RegistrationOption } from '../../services/authService'

const OTHER_CITY = '__other__'
const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirmation: '', specialization: '', location: '', proposedCity: '', clinicName: '' }

export function DoctorRegistrationPage() {
  const { i18n, t } = useTranslation()
  const [form, setForm] = useState(emptyForm)
  const [options, setOptions] = useState<{ specializations: RegistrationOption[]; locations: RegistrationOption[] }>({ specializations: [], locations: [] })
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoError, setProfilePhotoError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getDoctorRegistrationOptions(controller.signal).then(setOptions).catch(() => setStatus('auth.doctorRegistration.optionsError'))
    return () => controller.abort()
  }, [])

  const update = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setStatus('') }
  const localized = (option: RegistrationOption) => i18n.language.startsWith('ar') ? option.name_ar : option.name_en

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.passwordConfirmation || !form.specialization || !form.location || (form.location === OTHER_CITY && !form.proposedCity.trim()) || !profilePhoto) {
      if (!profilePhoto) setProfilePhotoError(t('profilePhoto.required'))
      setStatus('auth.doctorRegistration.required'); return
    }
    if (form.password !== form.passwordConfirmation) { setStatus('auth.doctorRegistration.passwordMismatch'); return }
    setSubmitting(true)
    try {
      await registerDoctor({ first_name: form.firstName, last_name: form.lastName, email: form.email, phone: form.phone, password: form.password, password_confirmation: form.passwordConfirmation, specialization: form.specialization, ...(form.location === OTHER_CITY ? { proposed_city: form.proposedCity.trim() } : { location: form.location }), clinic_name: form.clinicName, profile_photo: profilePhoto })
      setForm(emptyForm)
      setStatus('auth.doctorRegistration.success')
      setProfilePhoto(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setProfilePhotoError(t('profilePhoto.invalid'))
      setStatus(error instanceof ApiError && error.status === 422 ? 'auth.doctorRegistration.invalid' : 'auth.doctorRegistration.serviceError')
    } finally { setSubmitting(false) }
  }

  const fieldClass = 'grid gap-4 md:grid-cols-2 md:gap-x-5'
  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-[var(--color-primary-surface)]/70 to-[var(--color-background)] px-5 py-8 sm:px-8 sm:py-12">
        <section className="mx-auto w-full max-w-5xl rounded-3xl border border-[var(--color-border)] bg-white px-5 py-7 shadow-[0_18px_45px_rgb(15_118_110/0.08)] sm:px-10 sm:py-9">
          <header className="text-center"><p className="font-bold text-[var(--color-primary)]">{t('auth.doctorRegistration.eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('auth.doctorRegistration.title')}</h1><p className="mx-auto mt-2 max-w-2xl text-[var(--color-text-secondary)]">{t('auth.doctorRegistration.subtitle')}</p></header>
          <form className="mt-7" noValidate onSubmit={submit}>
            <div className={fieldClass}>
              <InputField id="doctor-first-name" icon={<UserIcon />} label={t('auth.registration.firstNameLabel')} onChange={(e) => update('firstName', e.target.value)} value={form.firstName} />
              <InputField id="doctor-last-name" icon={<UserIcon />} label={t('auth.registration.lastNameLabel')} onChange={(e) => update('lastName', e.target.value)} value={form.lastName} />
              <InputField className="direction-ltr" id="doctor-email" icon={<MailIcon />} label={t('auth.registration.emailLabel')} onChange={(e) => update('email', e.target.value)} type="email" value={form.email} />
              <InputField className="direction-ltr" id="doctor-phone" icon={<PhoneIcon />} label={t('auth.registration.phoneLabel')} onChange={(e) => update('phone', e.target.value)} type="tel" value={form.phone} />
              <InputField id="doctor-password" icon={<LockIcon />} label={t('auth.registration.passwordLabel')} onChange={(e) => update('password', e.target.value)} type="password" value={form.password} />
              <InputField id="doctor-password-confirmation" icon={<LockIcon />} label={t('auth.registration.passwordConfirmationLabel')} onChange={(e) => update('passwordConfirmation', e.target.value)} type="password" value={form.passwordConfirmation} />
              <SelectField id="doctor-specialization" icon={<UserIcon />} label={t('auth.doctorRegistration.specialization')} onChange={(e) => update('specialization', e.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseSpecialization') }, ...options.specializations.map((option) => ({ value: option.code, label: localized(option) }))]} value={form.specialization} />
              <SelectField id="doctor-location" icon={<UserIcon />} label={t('auth.doctorRegistration.location')} onChange={(e) => update('location', e.target.value)} options={[{ value: '', label: t('auth.doctorRegistration.chooseLocation') }, ...options.locations.map((option) => ({ value: option.code, label: localized(option) })), { value: OTHER_CITY, label: t('auth.doctorRegistration.otherCity') }]} value={form.location} />
              {form.location === OTHER_CITY && <InputField id="doctor-proposed-city" icon={<UserIcon />} label={t('auth.doctorRegistration.proposedCity')} onChange={(e) => update('proposedCity', e.target.value)} placeholder={t('auth.doctorRegistration.proposedCityPlaceholder')} value={form.proposedCity} />}
              <div className="md:col-span-2"><InputField id="doctor-clinic" icon={<UserIcon />} label={t('auth.doctorRegistration.clinic')} onChange={(e) => update('clinicName', e.target.value)} value={form.clinicName} /></div>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{t('auth.doctorRegistration.cityReviewNote')}</p>
            <div className="mt-5"><ProfilePhotoField error={profilePhotoError} file={profilePhoto} onChange={(file) => { setProfilePhoto(file); setProfilePhotoError('') }} required /></div>
            <p aria-live="polite" className="mt-4 min-h-10 rounded-xl bg-[var(--color-primary-surface)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">{status ? t(status) : t('auth.doctorRegistration.verificationNote')}</p>
            <div className="mx-auto mt-4 max-w-xl"><PrimaryButton disabled={submitting} type="submit">{t(submitting ? 'auth.doctorRegistration.submitting' : 'auth.doctorRegistration.submit')}</PrimaryButton></div>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">{t('auth.registration.haveAccount')} <Link className="font-bold text-[var(--color-primary)] hover:underline" to="/login">{t('auth.registration.signIn')}</Link></p>
        </section>
      </div>
    </PublicLayout>
  )
}
