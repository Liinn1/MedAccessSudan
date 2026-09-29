import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { LaboratoryLayout } from '../../layouts/LaboratoryLayout'
import { ApiError } from '../../services/apiClient'
import { getDoctorRegistrationOptions, type RegistrationOption } from '../../services/authService'
import { getLaboratoryProfile, updateLaboratoryProfile, updateLaboratoryProfilePhoto, type LaboratoryProfilePayload } from '../../services/laboratoryService'
import { getProviderVerification, type ProviderVerificationPayload } from '../../services/providerVerificationService'
import { ProviderVerificationCard } from '../../components/verification/ProviderVerificationCard'
import type { AuthenticatedUser } from '../../services/authService'

export function LaboratoryProfilePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [profile, setProfile] = useState<LaboratoryProfilePayload | null>(null)
  const [locations, setLocations] = useState<RegistrationOption[]>([])
  const [form, setForm] = useState({ name: '', phone: '', address: '', location: '' })
  const [verification, setVerification] = useState<ProviderVerificationPayload | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const arabic = i18n.language.startsWith('ar')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getLaboratoryProfile(controller.signal), getDoctorRegistrationOptions(controller.signal), getProviderVerification('laboratory', controller.signal)])
      .then(([payload, options, nextVerification]) => {
        setUser(payload.user)
        setProfile(payload.profile)
        setVerification(nextVerification)
        setLocations(options.locations)
        setForm({ name: payload.profile.name, phone: payload.profile.phone ?? payload.user.phone ?? '', address: payload.profile.address, location: payload.profile.location?.code ?? '' })
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

  return <LaboratoryLayout activeSection="profile" user={user ? { ...user, profile_image_url: profile?.profile_image_url ?? user.profile_image_url } : null}>
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
      <header><p className="font-bold text-[var(--color-primary)]">{t('laboratory.profile.eyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('laboratory.profile.title')}</h1><p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('laboratory.profile.description')}</p></header>
      {message && <p className="mt-4 font-semibold text-[var(--color-primary)]">{message}</p>}
      {state === 'loading' ? <LoadingState contained message={t('laboratory.profile.loading')} /> : state === 'error' || !profile || !user ? <ErrorState contained message={t('laboratory.profile.error')} onRetry={() => setState('loading')} retryLabel={t('laboratory.dashboard.retry')} /> : <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-4">
            <label className="font-semibold">{t('laboratory.profile.name')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label>
            <label className="font-semibold">{t('laboratory.profile.phone')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} /></label>
            <label className="font-semibold">{t('laboratory.profile.location')}<select className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} value={form.location}>{locations.map((location) => <option key={location.code} value={location.code}>{arabic ? location.name_ar : location.name_en}</option>)}</select></label>
            <label className="font-semibold">{t('laboratory.profile.address')}<input className="mt-2 block w-full rounded-2xl border border-[var(--color-border)] px-4 py-3" onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} /></label>
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{t('laboratory.profile.accountNote')}</p>
          <button className="mt-5 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={busy !== ''} onClick={save} type="button">{t(busy === 'details' ? 'laboratory.profile.saving' : 'laboratory.profile.save')}</button>
        </section>
        <div className="grid gap-6">
          <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">{t('laboratory.profile.photo')}</h2>
            <div className="mt-5"><ProfilePhotoField currentUrl={profile.profile_image_url} file={file} name={profile.name} onChange={setFile} required={false} /></div>
            <button className="mt-5 w-full rounded-full bg-[var(--color-primary)] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={!file || busy !== ''} onClick={savePhoto} type="button">{t(busy === 'photo' ? 'laboratory.profile.saving' : 'profilePage.savePhoto')}</button>
          </section>
          <ProviderVerificationCard onChange={setVerification} role="laboratory" verification={verification} />
        </div>
      </div>}
    </div>
  </LaboratoryLayout>
}
