import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { ProfileCompletion } from '../../components/profile/ProfileCompletion'
import { PatientLayout } from '../../layouts/PatientLayout'
import { getCurrentUser, logout, type AuthenticatedUser } from '../../services/authService'
import { removePatientProfilePhoto, updatePatientProfilePhoto } from '../../services/profilePhotoService'
import { patientProfileCompletion } from '../../utils/profileCompletion'

export function PatientProfilePage() {
  const { t } = useTranslation(); const navigate = useNavigate(); const [user, setUser] = useState<AuthenticatedUser | null>(null); const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { const controller = new AbortController(); getCurrentUser(controller.signal).then((value) => value.role === 'patient' ? setUser(value) : navigate('/login', { replace: true })).catch(() => navigate('/login', { replace: true })); return () => controller.abort() }, [navigate])
  async function save() { if (!file) return; setBusy(true); setMessage(''); try { setUser(await updatePatientProfilePhoto(file)); setFile(null); setMessage('profilePhoto.updated') } catch { setMessage('profilePhoto.updateError') } finally { setBusy(false) } }
  async function remove() { setBusy(true); try { setUser(await removePatientProfilePhoto()); setFile(null); setMessage('profilePhoto.removed') } catch { setMessage('profilePhoto.updateError') } finally { setBusy(false) } }
  async function signOut() { await logout(); navigate('/login') }
  return <PatientLayout activeSection="profile" isLoggingOut={false} onAppointments={() => undefined} onDashboard={() => navigate('/patient/home')} onLogout={signOut} onProfile={() => undefined}><div className="mx-auto max-w-3xl px-5 py-8"><header><h1 className="text-3xl font-extrabold">{t('profilePage.patientTitle')}</h1><p className="mt-2 text-[var(--color-text-secondary)]">{t('profilePage.patientDescription')}</p></header>{user && <><div className="mt-6"><ProfileCompletion completion={patientProfileCompletion(user)} onMissingItem={() => document.getElementById('patient-photo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} /></div><section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8" id="patient-photo"><ProfilePhotoField currentUrl={user.profile_image_url} file={file} onChange={setFile} onRemove={remove} /><button className="mt-5 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={!file || busy} onClick={save}>{t(busy ? 'profilePage.saving' : 'profilePage.save')}</button></section></>}<p aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold text-[var(--color-primary)]">{message ? t(message) : ''}</p></div></PatientLayout>
}
