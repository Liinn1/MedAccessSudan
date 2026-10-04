import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ProfileCompletion } from '../../components/profile/ProfileCompletion'
import { ServiceAvailabilitySelector } from '../../components/profile/ServiceAvailabilitySelector'
import { ProfileTabs } from '../../components/profile/ProfileTabs'
import { SecuritySection } from '../../components/profile/SecuritySection'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ContextualFeedback, type ContextualFeedbackState } from '../../components/feedback/ContextualFeedback'
import { ProviderVerificationCard } from '../../components/verification/ProviderVerificationCard'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { ApiError } from '../../services/apiClient'
import { type AuthenticatedUser } from '../../services/authService'
import { getDoctorDashboard, updateDoctorProfile, type DoctorDashboardProfile } from '../../services/doctorDashboardService'
import { updateDoctorProfilePhoto } from '../../services/profilePhotoService'
import { getProviderVerification, type ProviderVerificationPayload } from '../../services/providerVerificationService'
import { doctorProfileCompletion, type CompletionItemKey } from '../../utils/profileCompletion'

type ProfileForm = { clinic_name: string; biography: string; biography_language: 'en' | 'ar'; offers_clinic_visits: boolean; offers_home_visits: boolean }
type Tab = 'information' | 'professional' | 'verification' | 'security'
const emptyForm: ProfileForm = { clinic_name: '', biography: '', biography_language: 'en', offers_clinic_visits: true, offers_home_visits: false }
const tabs: Tab[] = ['information', 'professional', 'verification', 'security']

export function DoctorProfileManagementPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<Tab>(location.hash === '#account-verification' ? 'verification' : 'information')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [profile, setProfile] = useState<DoctorDashboardProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [detailsFeedback, setDetailsFeedback] = useState<ContextualFeedbackState>(null)
  const [photoFeedback, setPhotoFeedback] = useState<ContextualFeedbackState>(null)
  const [busy, setBusy] = useState('')
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [verification, setVerification] = useState<ProviderVerificationPayload | null>(null)

  useEffect(() => {
    if (tab !== 'verification') return
    const controller = new AbortController()
    getProviderVerification('doctor', controller.signal).then(setVerification).catch(() => {})
    return () => controller.abort()
  }, [tab])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getDoctorDashboard(controller.signal), getProviderVerification('doctor', controller.signal)])
      .then(([data, nextVerification]) => {
        setUser(data.user)
        setProfile(data.profile)
        setVerification(nextVerification)
        if (data.profile) setForm({ clinic_name: data.profile.clinic_name ?? '', biography: data.profile.biography ?? '', biography_language: data.profile.biography_language ?? (i18n.language.startsWith('ar') ? 'ar' : 'en'), offers_clinic_visits: data.profile.offers_clinic_visits, offers_home_visits: data.profile.offers_home_visits })
        setLoadState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
        else setLoadState('error')
      })
    return () => controller.abort()
  }, [attempt, i18n.language, navigate])

  const update = (field: keyof ProfileForm, value: string | boolean) => { setForm((current) => ({ ...current, [field]: value })); setDetailsFeedback(null) }
  async function saveDetails() {
    if (!form.offers_clinic_visits && !form.offers_home_visits) { setDetailsFeedback({ type: 'error', messageKey: 'profilePage.consultationRequired' }); return }
    setBusy('details'); setDetailsFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try {
      const updated = await updateDoctorProfile({
        clinic_name: form.offers_clinic_visits ? (form.clinic_name.trim() || null) : (profile?.clinic_name ?? null),
        biography: form.biography.trim() || null,
        biography_language: form.biography.trim() ? form.biography_language : null,
        offers_clinic_visits: form.offers_clinic_visits,
        offers_home_visits: form.offers_home_visits,
      })
      setProfile((current) => current ? { ...current, ...updated } : current)
      setDetailsFeedback({ type: 'success', messageKey: 'profilePage.updated' })
    } catch (error) {
      setDetailsFeedback({ type: 'error', messageKey: error instanceof ApiError && error.status === 422 ? 'profilePage.validationError' : 'profilePage.updateError' })
    } finally { setBusy('') }
  }
  async function savePhoto() {
    if (!file) return
    setBusy('photo'); setPhotoFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try {
      const url = await updateDoctorProfilePhoto(file)
      setProfile((current) => current ? { ...current, profile_image_url: url } : current)
      setFile(null)
      setPhotoFeedback({ type: 'success', messageKey: 'profilePhoto.updated' })
    } catch { setPhotoFeedback({ type: 'error', messageKey: 'profilePhoto.updateError' }) }
    finally { setBusy('') }
  }
  const localized = (value: DoctorDashboardProfile['specialization']) => value ? (i18n.language.startsWith('ar') ? value.name_ar : value.name_en) : t('doctor.dashboard.notProvided')
  function handleMissing(item: CompletionItemKey) {
    if (item === 'weeklyAvailability') { navigate('/doctor/availability'); return }
    if (item === 'profilePicture') { setTab('information'); return }
    if (item === 'professionalBio' || item === 'clinic') { setTab('professional'); return }
    setTab('verification')
  }

  return (
    <DoctorLayout activeSection="profile" user={user ? { ...user, profile_image_url: profile?.profile_image_url ?? user.profile_image_url } : null}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <header>
          <p className="font-bold text-[var(--color-primary)]">{t('profilePage.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('profilePage.doctorTitle')}</h1>
          <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('profilePage.doctorDescription')}</p>
        </header>
        {loadState === 'loading' ? <LoadingState contained message={t('profilePage.loading')} /> : loadState === 'error' ? <ErrorState contained message={t('profilePage.loadError')} onRetry={() => { setLoadState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('doctor.dashboard.retry')} /> : !profile || !user ? <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-900">{t('profilePage.missing')}</div> : <>
          <ProfileTabs labelFor={(key) => t(`profilePage.tabs.${key}`)} onChange={setTab} tabs={tabs} value={tab} />
          {tab === 'information' && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm" id="doctor-photo">
                <h2 className="text-xl font-extrabold">{t('profilePage.photo')}</h2>
                <div className="mt-5"><ProfilePhotoField currentUrl={profile.profile_image_url} file={file} name={user.name} onChange={(value) => { setFile(value); setPhotoFeedback(null) }} required /></div>
                <button className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={!file || busy !== ''} onClick={savePhoto} type="button">{t(busy === 'photo' ? 'profilePage.saving' : 'profilePage.savePhoto')}</button>
                <ContextualFeedback feedback={photoFeedback} />
              </section>
              <section className="rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-6" id="doctor-verified">
                <h2 className="text-xl font-extrabold">{t('profilePage.verifiedDetails')}</h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('profilePage.verifiedNote')}</p>
                <dl className="mt-5 space-y-4">
                  <div><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.specialization')}</dt><dd className="mt-1 font-bold">{localized(profile.specialization)}</dd></div>
                  <div><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('doctor.dashboard.location')}</dt><dd className="mt-1 font-bold">{localized(profile.location)}</dd></div>
                </dl>
              </section>
            </div>
          )}
          {tab === 'professional' && (
            <div className="mt-6 grid gap-6">
              <ProfileCompletion completion={doctorProfileCompletion(user, profile)} onMissingItem={handleMissing} />
              <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8" id="doctor-details">
                <h2 className="text-2xl font-extrabold">{t('profilePage.professionalDetails')}</h2>
                <div className="mt-6 grid gap-5">
                  <ServiceAvailabilitySelector
                    legend={t('profilePage.consultationTypes')}
                    options={[
                      { key: 'clinic', label: t('profilePage.clinicVisits'), checked: form.offers_clinic_visits, onChange: (checked) => update('offers_clinic_visits', checked) },
                      { key: 'home', label: t('profilePage.homeVisits'), checked: form.offers_home_visits, onChange: (checked) => update('offers_home_visits', checked) },
                    ]}
                  />
                  {form.offers_clinic_visits && <label className="font-semibold">{t('profilePage.clinic')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={255} onChange={(event) => update('clinic_name', event.target.value)} value={form.clinic_name} /></label>}
                  <label className="font-semibold">{t('profilePage.biographyLanguage')}<select className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3" onChange={(event) => update('biography_language', event.target.value)} value={form.biography_language}><option value="en">{t('profilePage.languages.en')}</option><option value="ar">{t('profilePage.languages.ar')}</option></select></label>
                  <label className="font-semibold">{t('profilePage.biography')}<textarea className="mt-2 block min-h-40 w-full resize-y rounded-2xl border border-[var(--color-border)] px-4 py-3" dir={form.biography_language === 'ar' ? 'rtl' : 'ltr'} lang={form.biography_language} maxLength={2000} onChange={(event) => update('biography', event.target.value)} value={form.biography} /><span className="mt-2 block text-sm font-normal text-[var(--color-text-secondary)]">{t('profilePage.biographyHelp')}</span></label>
                </div>
                <button className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={busy !== ''} onClick={saveDetails} type="button">{t(busy === 'details' ? 'profilePage.saving' : 'profilePage.saveDetails')}</button>
                <ContextualFeedback feedback={detailsFeedback} />
              </section>
            </div>
          )}
          {tab === 'verification' && <div className="mt-6"><ProviderVerificationCard onChange={setVerification} role="doctor" verification={verification} /></div>}
          {tab === 'security' && <div className="mt-6"><SecuritySection /></div>}
        </>}
      </div>
    </DoctorLayout>
  )
}
