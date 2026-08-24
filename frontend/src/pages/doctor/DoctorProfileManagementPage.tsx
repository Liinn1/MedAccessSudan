import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ProfilePhotoField } from '../../components/forms/ProfilePhotoField'
import { DoctorLayout } from '../../layouts/DoctorLayout'
import { logout } from '../../services/authService'
import { getDoctorDashboard } from '../../services/doctorDashboardService'
import { updateDoctorProfilePhoto } from '../../services/profilePhotoService'

export function DoctorProfileManagementPage() {
  const { t } = useTranslation(); const navigate = useNavigate(); const [currentUrl, setCurrentUrl] = useState<string | null>(null); const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { const controller = new AbortController(); getDoctorDashboard(controller.signal).then((data) => setCurrentUrl(data.profile?.profile_image_url ?? null)).catch(() => navigate('/login', { replace: true })); return () => controller.abort() }, [navigate])
  async function save() { if (!file) return; setBusy(true); setMessage(''); try { setCurrentUrl(await updateDoctorProfilePhoto(file)); setFile(null); setMessage('profilePhoto.updated') } catch { setMessage('profilePhoto.updateError') } finally { setBusy(false) } }
  async function signOut() { await logout(); navigate('/login') }
  return <DoctorLayout activeSection="profile" isLoggingOut={false} onAvailability={() => undefined} onLogout={signOut} onProfile={() => undefined}><div className="mx-auto max-w-3xl px-5 py-8"><section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8"><h1 className="text-3xl font-extrabold">{t('profilePage.doctorTitle')}</h1><p className="mt-2 text-[var(--color-text-secondary)]">{t('profilePage.doctorDescription')}</p><div className="mt-6"><ProfilePhotoField currentUrl={currentUrl} file={file} onChange={setFile} required /><button className="mt-5 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-50" disabled={!file || busy} onClick={save}>{t(busy ? 'profilePage.saving' : 'profilePage.save')}</button></div><p aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold text-[var(--color-primary)]">{message ? t(message) : ''}</p></section></div></DoctorLayout>
}
