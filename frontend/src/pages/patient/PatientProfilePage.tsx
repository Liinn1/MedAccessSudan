import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ContextualFeedback, type ContextualFeedbackState } from '../../components/feedback/ContextualFeedback'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ProfileCompletion } from '../../components/profile/ProfileCompletion'
import { PatientLayout } from '../../layouts/PatientLayout'
import { ApiError } from '../../services/apiClient'
import { getCurrentUser, logout, type AuthenticatedUser } from '../../services/authService'
import { updatePatientProfile, type PatientProfileInput } from '../../services/patientProfileService'
import { removePatientProfilePhoto, updatePatientProfilePhoto } from '../../services/profilePhotoService'
import { patientProfileCompletion, type CompletionItemKey } from '../../utils/profileCompletion'

type LoadState = 'loading' | 'ready' | 'error'
const emptyForm: PatientProfileInput = { first_name: '', last_name: '', email: '', phone: '' }

export function PatientProfilePage() {
  const { t } = useTranslation(); const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser | null>(null); const [form, setForm] = useState<PatientProfileInput>(emptyForm); const [file, setFile] = useState<File | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading'); const [attempt, setAttempt] = useState(0); const [busy, setBusy] = useState<'details' | 'photo' | 'remove' | ''>(''); const [loggingOut, setLoggingOut] = useState(false)
  const [detailsFeedback, setDetailsFeedback] = useState<ContextualFeedbackState>(null); const [photoFeedback, setPhotoFeedback] = useState<ContextualFeedbackState>(null)

  useEffect(() => {
    const controller = new AbortController()
    getCurrentUser(controller.signal).then((value) => {
      if (value.role !== 'patient') return navigate('/login', { replace: true })
      setUser(value); setForm({ first_name: value.first_name ?? '', last_name: value.last_name ?? '', email: value.email, phone: value.phone ?? '' }); setLoadState('ready')
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) navigate('/login', { replace: true }); else setLoadState('error')
    })
    return () => controller.abort()
  }, [attempt, navigate])

  function updateField(field: keyof PatientProfileInput, value: string) { setForm((current) => ({ ...current, [field]: value })); setDetailsFeedback(null) }
  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('details'); setDetailsFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try {
      const updated = await updatePatientProfile({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim() })
      setUser(updated); setForm({ first_name: updated.first_name ?? '', last_name: updated.last_name ?? '', email: updated.email, phone: updated.phone ?? '' }); setDetailsFeedback({ type: 'success', messageKey: 'profilePage.patientDetailsUpdated' })
    } catch (error) { setDetailsFeedback({ type: 'error', messageKey: error instanceof ApiError && error.status === 422 ? 'profilePage.patientValidationError' : 'profilePage.patientUpdateError' }) } finally { setBusy('') }
  }
  async function savePhoto() {
    if (!file) return
    setBusy('photo'); setPhotoFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try { setUser(await updatePatientProfilePhoto(file)); setFile(null); setPhotoFeedback({ type: 'success', messageKey: 'profilePhoto.updated' }) } catch { setPhotoFeedback({ type: 'error', messageKey: 'profilePhoto.updateError' }) } finally { setBusy('') }
  }
  async function removePhoto() {
    setBusy('remove'); setPhotoFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try { setUser(await removePatientProfilePhoto()); setFile(null); setPhotoFeedback({ type: 'success', messageKey: 'profilePhoto.removed' }) } catch { setPhotoFeedback({ type: 'error', messageKey: 'profilePhoto.updateError' }) } finally { setBusy('') }
  }
  function goToMissingItem(item: CompletionItemKey) { document.getElementById(item === 'profilePicture' ? 'patient-photo' : 'patient-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  async function signOut() { setLoggingOut(true); try { await logout(); navigate('/login') } finally { setLoggingOut(false) } }

  return <PatientLayout activeSection="profile" isLoggingOut={loggingOut} onAppointments={() => navigate('/patient/appointments')} onDashboard={() => navigate('/patient/home')} onLogout={signOut} onProfile={() => undefined}><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
    <header><p className="font-bold text-[var(--color-primary)]">{t('profilePage.patientEyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('profilePage.patientTitle')}</h1><p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">{t('profilePage.patientDescription')}</p></header>
    {loadState === 'loading' ? <LoadingState contained message={t('profilePage.patientLoading')} /> : loadState === 'error' ? <ErrorState contained message={t('profilePage.patientLoadError')} onRetry={() => { setLoadState('loading'); setAttempt((value) => value + 1) }} retryLabel={t('patient.home.retry')} /> : user && <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="order-2 lg:order-1 lg:col-span-2"><ProfileCompletion completion={patientProfileCompletion(user)} onMissingItem={goToMissingItem} /></div>
      <section className="order-3 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm lg:order-2 sm:p-8" id="patient-details"><h2 className="text-2xl font-extrabold">{t('profilePage.personalInformation')}</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('profilePage.personalInformationHelp')}</p><form className="mt-6" onSubmit={saveDetails}><div className="grid gap-5 sm:grid-cols-2">
        <label className="font-semibold">{t('profilePage.firstName')}<input autoComplete="given-name" className="mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={100} onChange={(event) => updateField('first_name', event.target.value)} required value={form.first_name} /></label>
        <label className="font-semibold">{t('profilePage.lastName')}<input autoComplete="family-name" className="mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={100} onChange={(event) => updateField('last_name', event.target.value)} required value={form.last_name} /></label>
        <label className="font-semibold">{t('profilePage.email')}<input autoComplete="email" className="mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" onChange={(event) => updateField('email', event.target.value)} required type="email" value={form.email} /></label>
        <label className="font-semibold">{t('profilePage.phone')}<input autoComplete="tel" className="direction-ltr mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 text-start focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" onChange={(event) => updateField('phone', event.target.value)} pattern="\+?[0-9\s-]{7,20}" required type="tel" value={form.phone} /></label>
      </div><button className="mt-6 min-h-12 rounded-full bg-[var(--color-primary)] px-6 font-bold text-white transition hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50" disabled={busy !== ''} type="submit">{t(busy === 'details' ? 'profilePage.saving' : 'profilePage.saveDetails')}</button><ContextualFeedback feedback={detailsFeedback} /></form></section>
      <section className="order-1 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm lg:order-3" id="patient-photo"><h2 className="text-xl font-extrabold">{t('profilePage.photo')}</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('profilePage.patientPhotoHelp')}</p><div className="mt-5"><ProfilePhotoField currentUrl={user.profile_image_url} file={file} onChange={(value) => { setFile(value); setPhotoFeedback(null) }} onRemove={removePhoto} /></div><button className="mt-5 min-h-12 w-full rounded-full bg-[var(--color-primary)] px-6 font-bold text-white disabled:opacity-50" disabled={!file || busy !== ''} onClick={savePhoto} type="button">{t(busy === 'photo' ? 'profilePage.saving' : 'profilePage.savePhoto')}</button><ContextualFeedback feedback={photoFeedback} /></section>
    </div>}
  </div></PatientLayout>
}
