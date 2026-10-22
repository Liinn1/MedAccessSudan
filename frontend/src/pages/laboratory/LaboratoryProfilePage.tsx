import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ProfileCompletion } from '../../components/profile/ProfileCompletion'
import { ProfileTabs } from '../../components/profile/ProfileTabs'
import { ServiceAvailabilitySelector } from '../../components/profile/ServiceAvailabilitySelector'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, type RegistrationOption } from '../../services/authService'
import { getLaboratoryDashboard, getLaboratoryProfile, updateLaboratoryProfile, updateLaboratoryProfilePhoto, type LaboratoryProfilePayload } from '../../services/laboratoryService'
import { getProviderVerification, type ProviderVerificationPayload } from '../../services/providerVerificationService'
import { SecuritySection } from '../../components/profile/SecuritySection'
import { ProviderVerificationCard } from '../../components/verification/ProviderVerificationCard'
import type { AuthenticatedUser } from '../../services/authService'
import { laboratoryProfileCompletion, type CompletionItemKey } from '../../utils/profileCompletion'
import { localizedName } from '../../utils/localizedName'
import { SearchableSelectField } from '../../components/forms/SearchableSelectField'

type Tab = 'information' | 'laboratory' | 'verification' | 'security'
const tabs: Tab[] = ['information', 'laboratory', 'verification', 'security']

export function LaboratoryProfilePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<Tab>(location.hash === '#account-verification' ? 'verification' : 'information')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [profile, setProfile] = useState<LaboratoryProfilePayload | null>(null)
  const [locations, setLocations] = useState<RegistrationOption[]>([])
  const [form, setForm] = useState({ name: '', phone: '', address: '', location: '', supports_at_lab: true, supports_home_collection: false })
  const [verification, setVerification] = useState<ProviderVerificationPayload | null>(null)
  const [testsOffered, setTestsOffered] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (tab !== 'verification') return
    const controller = new AbortController()
    getProviderVerification('laboratory', controller.signal).then(setVerification).catch(() => {})
    return () => controller.abort()
  }, [tab])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLaboratoryProfile(controller.signal), getDoctorRegistrationOptions(controller.signal), getProviderVerification('laboratory', controller.signal), getLaboratoryDashboard(controller.signal)])
      .then(([payload, options, nextVerification, dashboard]) => {
        setUser(payload.user)
        setProfile(payload.profile)
        setVerification(nextVerification)
        setTestsOffered(dashboard.summary.tests_offered)
        setLocations(options.locations)
        setForm({ name: payload.profile.name, phone: payload.profile.phone ?? payload.user.phone ?? '', address: payload.profile.address, location: payload.profile.location?.code ?? '', supports_at_lab: Boolean(payload.profile.supports_at_lab), supports_home_collection: Boolean(payload.profile.supports_home_collection) })
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true })
        else setState('error')
      })
    return () => controller.abort()
  }, [navigate])

  async function save() {
    setBusy('details')
    try {
      const payload = await updateLaboratoryProfile(form)
      setProfile(payload.profile)
      setUser(payload.user)
      setMessage(t('laboratory.profile.saved'))
    } catch { setMessage(t('laboratory.profile.saveError')) }
    finally { setBusy('') }
  }

  async function savePhoto() {
    if (!file) return
    setBusy('photo')
    try {
      const url = await updateLaboratoryProfilePhoto(file)
      setProfile((current) => current ? { ...current, profile_image_url: url } : current)
      setFile(null)
      setMessage(t('profilePhoto.updated'))
    } catch { setMessage(t('profilePhoto.updateError')) }
    finally { setBusy('') }
  }

  function handleMissing(item: CompletionItemKey) {
    if (item === 'verificationDocuments') { setTab('verification'); return }
    if (item === 'laboratoryTests') { navigate('/laboratory/tests'); return }
    if (item === 'profilePicture') { setTab('information'); return }
    setTab('laboratory')
  }

  return (
    <LaboratoryLayout activeSection="profile" user={user ? { ...user, profile_image_url: profile?.profile_image_url ?? user.profile_image_url } : null}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <header>
          <p className="font-bold text-[var(--color-primary)]">{t('laboratory.profile.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('laboratory.profile.title')}</h1>
          <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('laboratory.profile.description')}</p>
        </header>
        {message && <p className="mt-4 font-semibold text-[var(--color-primary)]">{message}</p>}
        {state === 'loading' ? <LoadingState contained message={t('laboratory.profile.loading')} /> : state === 'error' || !profile || !user ? <ErrorState contained message={t('laboratory.profile.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : <>
          <ProfileTabs labelFor={(key) => t(`laboratory.profile.tabs.${key}`)} onChange={setTab} tabs={tabs} value={tab} />
          {tab === 'information' && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm" id="laboratory-photo">
                <h2 className="text-xl font-extrabold">{t('laboratory.profile.photo')}</h2>
                <div className="mt-5"><ProfilePhotoField currentUrl={profile.profile_image_url} file={file} name={profile.name} onChange={setFile} required={false} /></div>
                <button className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={!file || busy !== ''} onClick={savePhoto} type="button">{t(busy === 'photo' ? 'laboratory.profile.saving' : 'profilePage.savePhoto')}</button>
              </section>
              <section className="rounded-3xl border border-teal-100 bg-[var(--color-primary-surface)] p-6">
                <h2 className="text-xl font-extrabold">{t('laboratory.profile.accountSummary')}</h2>
                <dl className="mt-5 space-y-4">
                  <div><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('laboratory.profile.name')}</dt><dd className="mt-1 font-bold" dir="auto">{profile.name}</dd></div>
                  <div><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('profilePage.email')}</dt><dd className="mt-1 break-all font-bold" dir="ltr">{user.email}</dd></div>
                  <div><dt className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('laboratory.profile.phone')}</dt><dd className="direction-ltr mt-1 text-start font-bold">{profile.phone || user.phone || '—'}</dd></div>
                </dl>
              </section>
            </div>
          )}
          {tab === 'laboratory' && (
            <div className="mt-6 grid gap-6">
              <ProfileCompletion completion={laboratoryProfileCompletion(user, profile, verification, testsOffered)} onMissingItem={handleMissing} />
              <div className="grid gap-6">
              <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-extrabold">{t('laboratory.profile.information')}</h2>
                <div className="mt-6 grid gap-4">
                  <label className="font-semibold">{t('laboratory.profile.name')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label>
                  <label className="font-semibold">{t('laboratory.profile.phone')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} /></label>
                  <SearchableSelectField id="laboratory-state" label={t('laboratory.profile.location')} onChange={(value) => setForm((current) => ({ ...current, location: value }))} options={locations.map((item) => ({ value: item.code, label: localizedName(item, i18n.resolvedLanguage) }))} placeholder={t('auth.laboratoryRegistration.chooseLocation')} searchLabel={t('auth.laboratoryRegistration.searchState')} value={form.location} />
                  <label className="font-semibold">{t('laboratory.profile.address')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} /></label>
                  <ServiceAvailabilitySelector
                    legend={t('laboratory.profile.collectionServices')}
                    options={[
                      { key: 'laboratory', label: t('laboratory.profile.visitLab'), checked: form.supports_at_lab, onChange: (checked) => setForm((current) => ({ ...current, supports_at_lab: checked })) },
                      { key: 'home', label: t('laboratory.profile.homeCollection'), description: t('laboratory.profile.homeCollectionHint'), checked: form.supports_home_collection, onChange: (checked) => setForm((current) => ({ ...current, supports_home_collection: checked })) },
                    ]}
                  />
                </div>
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{t('laboratory.profile.accountNote')}</p>
                <button className="mt-5 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={busy !== ''} onClick={save} type="button">{t(busy === 'details' ? 'laboratory.profile.saving' : 'laboratory.profile.save')}</button>
              </section>
              </div>
            </div>
          )}
          {tab === 'verification' && <div className="mt-6"><ProviderVerificationCard onChange={setVerification} role="laboratory" verification={verification} /></div>}
          {tab === 'security' && <div className="mt-6"><SecuritySection /></div>}
        </>}
      </div>
    </LaboratoryLayout>
  )
}
