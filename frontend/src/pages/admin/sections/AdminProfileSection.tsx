import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { ProfilePhotoField } from '../../../components/forms/ProfilePhotoField'
import { ProfileTabs } from '../../../components/profile/ProfileTabs'
import { SecuritySection } from '../../../components/profile/SecuritySection'
import { ActionButton } from '../../../components/buttons/ActionButton'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { ContextualFeedback, type ContextualFeedbackState } from '../../../components/feedback/ContextualFeedback'
import { ConfirmationDialog } from '../../../components/feedback/ConfirmationDialog'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ApiError } from '../../../services/apiClient'
import { getAdministrators, inviteAdministrator, removeAdminProfilePhoto, updateAdministratorAccess, updateAdminProfile, updateAdminProfilePhoto, type AdministratorAccount } from '../../../services/adminService'
import type { AuthenticatedUser } from '../../../services/authService'
import { isValidEmail } from '../../../utils/authValidation'
import { SUDAN_TIME_ZONE } from '../../../utils/dateTime'

type Tab = 'profile' | 'security' | 'admins'

export function AdminProfileSection({ user, onUpdated }: { user: AuthenticatedUser; onUpdated: (user: AuthenticatedUser) => void }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('profile')
  const tabs: Tab[] = ['profile', 'security', 'admins']

  return (
    <DashboardPage>
      <AdminPageHeader description={t('admin.profile.description')} eyebrow={t('admin.workspace')} title={t('admin.navigation.profile')} />
      <ProfileTabs labelFor={(key) => t(`admin.profile.tabs.${key}`)} onChange={setTab} tabs={tabs} value={tab} />
      {tab === 'profile' && <AdminIdentityForm onUpdated={onUpdated} user={user} />}
      {tab === 'security' && <div className="mt-5"><SecuritySection /></div>}
      {tab === 'admins' && <AdminUsersPanel canManage={user.role === 'super_admin'} currentId={user.id} />}
    </DashboardPage>
  )
}

function AdminIdentityForm({ user, onUpdated }: { user: AuthenticatedUser; onUpdated: (user: AuthenticatedUser) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState('')
  const [detailsFeedback, setDetailsFeedback] = useState<ContextualFeedbackState>(null)
  const [photoFeedback, setPhotoFeedback] = useState<ContextualFeedbackState>(null)

  async function saveDetails(event: FormEvent) {
    event.preventDefault()
    setBusy('details'); setDetailsFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try {
      onUpdated({ ...user, ...await updateAdminProfile({ name: name.trim(), phone: phone.trim() || null }) })
      setDetailsFeedback({ type: 'success', messageKey: 'admin.profile.saved' })
    } catch (error) {
      setDetailsFeedback({ type: 'error', messageKey: error instanceof ApiError && error.status === 422 ? 'admin.errors.validation' : 'admin.errors.action' })
    } finally { setBusy('') }
  }

  async function savePhoto() {
    if (!file) return
    setBusy('photo'); setPhotoFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try { onUpdated(await updateAdminProfilePhoto(file)); setFile(null); setPhotoFeedback({ type: 'success', messageKey: 'profilePhoto.updated' }) }
    catch { setPhotoFeedback({ type: 'error', messageKey: 'profilePhoto.updateError' }) }
    finally { setBusy('') }
  }

  async function removePhoto() {
    setBusy('remove'); setPhotoFeedback({ type: 'loading', messageKey: 'profilePage.saving' })
    try { onUpdated(await removeAdminProfilePhoto()); setFile(null); setPhotoFeedback({ type: 'success', messageKey: 'profilePhoto.removed' }) }
    catch { setPhotoFeedback({ type: 'error', messageKey: 'profilePhoto.updateError' }) }
    finally { setBusy('') }
  }

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-extrabold">{t('profilePage.personalInformation')}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('admin.profile.personalHelp')}</p>
        <form className="mt-6" onSubmit={saveDetails}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="font-semibold">{t('admin.management.name')}<input className="mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></label>
            <label className="font-semibold">{t('profilePage.email')}<input className="mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-slate-50 px-4" disabled value={user.email} /></label>
            <label className="font-semibold">{t('profilePage.phone')}<input className="direction-ltr mt-2 block min-h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 text-start focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-teal-100" onChange={(event) => setPhone(event.target.value)} value={phone} /></label>
            <div className="font-semibold">{t('admin.table.role')}<p className="mt-2"><AdminStatusBadge label={t(`roles.${user.role}`)} status="verified" /></p></div>
          </div>
          <ActionButton className="mt-6" disabled={busy !== ''} size="lg" type="submit" variant="primary">{t(busy === 'details' ? 'profilePage.saving' : 'admin.profile.save')}</ActionButton>
          <ContextualFeedback feedback={detailsFeedback} />
        </form>
      </section>
      <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm" id="admin-photo">
        <h2 className="text-xl font-extrabold">{t('profilePage.photo')}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('admin.profile.photoHelp')}</p>
        <div className="mt-5"><ProfilePhotoField currentUrl={user.profile_image_url} file={file} name={user.name} onChange={(value) => { setFile(value); setPhotoFeedback(null) }} onRemove={removePhoto} /></div>
        <ActionButton className="mt-5 w-full" disabled={!file || busy !== ''} onClick={() => void savePhoto()} size="lg" variant="primary">{t(busy === 'photo' ? 'profilePage.saving' : 'profilePage.savePhoto')}</ActionButton>
        <ContextualFeedback feedback={photoFeedback} />
      </section>
    </div>
  )
}

function AdminUsersPanel({ canManage, currentId }: { canManage: boolean; currentId: number }) {
  const { i18n, t } = useTranslation()
  const [admins, setAdmins] = useState<AdministratorAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<AdministratorAccount | null>(null)
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'

  async function load(signal?: AbortSignal) {
    setLoading(true); setError('')
    try { setAdmins(await getAdministrators(signal)) }
    catch { if (!signal?.aborted) setError(t('admin.errors.load')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !isValidEmail(email)) { setFormError(t('admin.admins.invalid')); return }
    setBusy(true); setFormError('')
    try {
      await inviteAdministrator({ name: name.trim(), email: email.trim(), role: 'admin' })
      setOpen(false); setName(''); setEmail('')
      await load()
    } catch (caught) {
      setFormError(caught instanceof ApiError && caught.status === 403 ? t('admin.admins.forbidden') : t('admin.errors.action'))
    } finally { setBusy(false) }
  }

  async function applyAccess() {
    if (!pending) return
    setBusy(true)
    try {
      await updateAdministratorAccess(pending.id, { is_active: !pending.is_active })
      setPending(null)
      await load()
    } catch { setError(t('admin.errors.action')) }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{t('admin.admins.title')}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('admin.admins.description')}</p>
        </div>
        {canManage && <ActionButton onClick={() => setOpen(true)} variant="primary">{t('admin.admins.add')}</ActionButton>}
      </div>
      {error && <ErrorState contained message={error} onRetry={() => void load()} retryLabel={t('admin.retry')} />}
      {loading ? <LoadingState contained message={t('admin.loading')} /> : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-start text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3">{t('admin.table.name')}</th>
                  <th className="px-4 py-3">{t('admin.table.email')}</th>
                  <th className="px-4 py-3">{t('admin.table.role')}</th>
                  <th className="px-4 py-3">{t('admin.table.status')}</th>
                  <th className="px-4 py-3">{t('admin.table.created')}</th>
                  <th className="px-4 py-3">{t('admin.accounts.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr className="border-b last:border-0" key={admin.id}>
                    <td className="px-4 py-3 font-bold">{admin.name}</td>
                    <td className="px-4 py-3">{admin.email}</td>
                    <td className="px-4 py-3">{t(`roles.${admin.role}`)}</td>
                    <td className="px-4 py-3"><AdminStatusBadge label={t(admin.is_active ? 'admin.accounts.active' : 'admin.accounts.suspended')} status={admin.is_active ? 'active' : 'suspended'} /></td>
                    <td className="px-4 py-3">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(admin.created_at))}</td>
                    <td className="px-4 py-3">{canManage && admin.role !== 'super_admin' && admin.id !== currentId ? (
                      <ActionButton onClick={() => setPending(admin)} size="sm" variant={admin.is_active ? 'danger' : 'secondary'}>{t(admin.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}</ActionButton>
                    ) : t('admin.accounts.dash')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {admins.map((admin) => (
              <article className="rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm" key={admin.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{admin.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t(`roles.${admin.role}`)}</p>
                  </div>
                  <AdminStatusBadge label={t(admin.is_active ? 'admin.accounts.active' : 'admin.accounts.suspended')} status={admin.is_active ? 'active' : 'suspended'} />
                </div>
                <p className="mt-3 text-sm">{admin.email}</p>
                {canManage && admin.role !== 'super_admin' && admin.id !== currentId && (
                  <ActionButton className="mt-3" onClick={() => setPending(admin)} size="sm" variant={admin.is_active ? 'danger' : 'secondary'}>{t(admin.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}</ActionButton>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {open && (
        <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <form className="w-full max-w-md rounded-3xl border bg-white p-6" onSubmit={create}>
            <h3 className="text-2xl font-extrabold">{t('admin.admins.add')}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('admin.admins.inviteHelp')}</p>
            <label className="mt-4 block font-bold">{t('admin.management.name')}<input className="mt-2 w-full rounded-2xl border px-4 py-3" onChange={(event) => setName(event.target.value)} required value={name} /></label>
            <label className="mt-4 block font-bold">{t('profilePage.email')}<input className="mt-2 w-full rounded-2xl border px-4 py-3" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label className="mt-4 block font-bold">{t('admin.table.role')}<input className="mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3" disabled value={t('roles.admin')} /></label>
            {formError && <p className="mt-3 text-sm font-semibold text-red-700">{formError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <ActionButton onClick={() => setOpen(false)} variant="tertiary">{t('admin.actions.cancel')}</ActionButton>
              <ActionButton disabled={busy} type="submit" variant="primary">{busy ? t('admin.actions.working') : t('admin.admins.sendInvite')}</ActionButton>
            </div>
          </form>
        </div>
      )}
      <ConfirmationDialog
        busy={busy}
        cancelLabel={t('admin.actions.cancel')}
        confirmLabel={t(pending?.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}
        description={pending ? t(pending.is_active ? 'admin.admins.suspendDescription' : 'admin.accounts.reactivateDescription', { name: pending.name }) : ''}
        loadingLabel={t('admin.actions.working')}
        onCancel={() => setPending(null)}
        onConfirm={() => void applyAccess()}
        open={Boolean(pending)}
        title={pending?.is_active ? t('admin.accounts.suspendTitle') : t('admin.accounts.reactivateTitle')}
        variant={pending?.is_active ? 'danger' : 'default'}
      />
    </div>
  )
}
