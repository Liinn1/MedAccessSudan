import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AdminFilter, AdminFilters, AdminSearch } from '../../../components/admin/AdminManagementList'
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader'
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge'
import { ProfileAvatar } from '../../../components/branding/ProfileAvatar'
import { ActionButton } from '../../../components/buttons/ActionButton'
import { DashboardEmptyState } from '../../../components/dashboard/DashboardEmptyState'
import { DashboardPage } from '../../../components/dashboard/DashboardPage'
import { ConfirmationDialog } from '../../../components/feedback/ConfirmationDialog'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { getAdminUser, getAdminUsers, updateAdminUser, type AccountListMeta, type MonitoredUser } from '../../../services/adminService'
import { SUDAN_TIME_ZONE } from '../../../utils/dateTime'

const typeOptions = ['', 'patient', 'providers', 'doctor', 'laboratory'] as const

export function AdminUsersSection() {
  const { i18n, t } = useTranslation()
  const [users, setUsers] = useState<MonitoredUser[]>([])
  const [meta, setMeta] = useState<AccountListMeta | null>(null)
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [verification, setVerification] = useState('')
  const [sort, setSort] = useState('newest')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<MonitoredUser | null>(null)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [pending, setPending] = useState<MonitoredUser | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const showVerificationFilter = role !== 'patient'

  function listQuery() {
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (status) params.set('status', status)
    if (showVerificationFilter && verification) params.set('verification', verification)
    if (sort) params.set('sort', sort)
    if (query.trim()) params.set('q', query.trim())
    if (page > 1) params.set('page', String(page))
    return params.toString() ? `?${params}` : ''
  }

  async function load(signal?: AbortSignal, options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true)
      setError('')
    }
    try {
      const result = await getAdminUsers(listQuery(), signal)
      setUsers(result.users)
      setMeta(result.meta)
    } catch {
      if (!signal?.aborted && !options?.silent) setError(t('admin.errors.load'))
    } finally {
      if (!signal?.aborted && !options?.silent) setLoading(false)
    }
  }
  const loadEffect = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void loadEffect(controller.signal) }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [role, status, verification, sort, query, page, showVerificationFilter])

  async function applyAccess() {
    if (!pending || busy) return
    const targetId = pending.id
    setBusy(true)
    setActionError('')
    try {
      const updated = await updateAdminUser(targetId, {
        is_active: !pending.is_active,
        reason: pending.is_active && reason.trim() ? reason.trim() : undefined,
      })
      setPending(null)
      setReason('')
      setUsers((current) => {
        const merged = current.map((user) => (user.id === updated.id ? { ...user, ...updated } : user))
        if (status === 'active' && !updated.is_active) return merged.filter((user) => user.id !== updated.id)
        if (status === 'inactive' && updated.is_active) return merged.filter((user) => user.id !== updated.id)
        return merged
      })
      if (selected?.id === targetId) {
        try {
          setSelected(await getAdminUser(targetId))
        } catch {
          setSelected((current) => (current?.id === targetId ? { ...current, ...updated } : current))
        }
      }
      void load(undefined, { silent: true })
    } catch {
      setActionError(t('admin.errors.action'))
    } finally {
      setBusy(false)
    }
  }

  function resetFilters() {
    setRole(''); setStatus(''); setVerification(''); setSort('newest'); setQuery(''); setPage(1)
  }

  async function openAccount(user: MonitoredUser) {
    setMenuKey(null)
    setError('')
    setSelected(user)
    try {
      setSelected(await getAdminUser(user.id))
    } catch {
      setError(t('admin.errors.action'))
    }
  }

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const dateFor = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(value))
  const filtersActive = Boolean(role || status || verification || query.trim() || sort !== 'newest')

  return (
    <DashboardPage>
      <AdminPageHeader description={t('admin.users.description')} eyebrow={t('admin.workspace')} title={t('admin.navigation.users')} />
      {error && <div className="mt-4"><ErrorState contained message={error} onRetry={() => void load()} retryLabel={t('admin.retry')} /></div>}
      <AdminFilters>
        <AdminFilter label={t('admin.users.accountType')} onChange={(value) => { setRole(value); setPage(1); if (value === 'patient') setVerification('') }} value={role}>
          {typeOptions.map((value) => (
            <option key={value || 'all'} value={value}>
              {value === '' ? t('admin.accounts.all') : value === 'providers' ? t('admin.accounts.providers') : t(`roles.${value}`)}
            </option>
          ))}
        </AdminFilter>
        <AdminFilter label={t('admin.table.status')} onChange={(value) => { setStatus(value); setPage(1) }} value={status}>
          <option value="">{t('admin.accounts.allStatuses')}</option>
          <option value="active">{t('admin.accounts.active')}</option>
          <option value="inactive">{t('admin.accounts.suspended')}</option>
        </AdminFilter>
        {showVerificationFilter && (
          <AdminFilter label={t('admin.accounts.columns.verification')} onChange={(value) => { setVerification(value); setPage(1) }} value={verification}>
            <option value="">{t('admin.accounts.allVerification')}</option>
            <option value="verified">{t('admin.accounts.verified')}</option>
            <option value="pending">{t('admin.accounts.pending')}</option>
            <option value="rejected">{t('admin.accounts.rejected')}</option>
          </AdminFilter>
        )}
        <AdminFilter label={t('admin.accounts.sort')} onChange={(value) => { setSort(value); setPage(1) }} value={sort}>
          <option value="newest">{t('admin.accounts.newest')}</option>
          <option value="oldest">{t('admin.accounts.oldest')}</option>
          <option value="name">{t('admin.accounts.name')}</option>
        </AdminFilter>
        <AdminSearch label={t('admin.users.search')} onChange={(value) => { setQuery(value); setPage(1) }} value={query} />
      </AdminFilters>
      <p className="mt-4 text-sm font-semibold text-[var(--color-text-secondary)]">
        {meta?.total ? t('admin.accounts.resultCount', { from: meta.from ?? 0, to: meta.to ?? 0, total: meta.total }) : t('admin.accounts.resultNone')}
      </p>
      {loading ? <div className="mt-4"><LoadingState contained message="" /></div> : users.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <DashboardEmptyState
            action={filtersActive ? <ActionButton onClick={resetFilters} size="sm" variant="secondary">{t('admin.accounts.clearFilters')}</ActionButton> : undefined}
            description={t('admin.accounts.emptyDescription')}
            title={t('admin.accounts.emptyTitle')}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-3xl border border-[var(--color-border)] bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-[var(--color-primary-surface)] text-[var(--color-text-secondary)]">
                <tr>
                  {(['account', 'type', 'contact', 'status', 'verification', 'joined', 'actions'] as const).map((column) => (
                    <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide" key={column}>{t(`admin.accounts.columns.${column}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-t border-[var(--color-border)]" key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfileAvatar className="size-9 shrink-0 rounded-full text-xs" imageUrl={user.profile_image_url} name={user.name} />
                        <div className="min-w-0">
                          <p className="truncate font-extrabold">{user.name}</p>
                          <p className="truncate text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t(`roles.${user.role}`)}</td>
                    <td className="px-4 py-3">
                      <p className="truncate">{user.email}</p>
                      {user.phone ? <p className="direction-ltr mt-0.5 text-xs text-[var(--color-text-secondary)]">{user.phone}</p> : null}
                    </td>
                    <td className="px-4 py-3"><AdminStatusBadge label={t(user.is_active ? 'admin.accounts.active' : 'admin.accounts.suspended')} status={user.is_active ? 'active' : 'suspended'} /></td>
                    <td className="px-4 py-3">{user.verification_status ? <AdminStatusBadge label={t(`verification.statuses.${user.verification_status}`)} status={user.verification_status} /> : t('admin.accounts.dash')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-secondary)]">{dateFor(user.created_at)}</td>
                    <td className="px-4 py-3"><AccountMenu menuKey={`desktop-${user.id}`} onOpen={() => void openAccount(user)} onSuspend={() => { setMenuKey(null); setActionError(''); setPending(user) }} onToggle={setMenuKey} openKey={menuKey} user={user} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {users.map((user) => (
              <article className="rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm" key={user.id}>
                <div className="flex items-start gap-3">
                  <ProfileAvatar className="size-10 shrink-0 rounded-full text-sm" imageUrl={user.profile_image_url} name={user.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">{user.name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{t(`roles.${user.role}`)}</p>
                      </div>
                      <AdminStatusBadge label={t(user.is_active ? 'admin.accounts.active' : 'admin.accounts.suspended')} status={user.is_active ? 'active' : 'suspended'} />
                    </div>
                    <p className="mt-2 truncate text-sm text-[var(--color-text-secondary)]">{user.email}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--color-text-secondary)]">{dateFor(user.created_at)}</p>
                      <AccountMenu menuKey={`mobile-${user.id}`} onOpen={() => void openAccount(user)} onSuspend={() => { setMenuKey(null); setActionError(''); setPending(user) }} onToggle={setMenuKey} openKey={menuKey} user={user} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {meta && meta.last_page > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <ActionButton disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)} size="sm" variant="tertiary">{t('common.previous')}</ActionButton>
              {pageNumbers(meta).map((number) => (
                <button className={`min-w-10 rounded-full px-3 py-2 text-sm font-bold ${number === meta.current_page ? 'bg-[var(--color-primary)] text-white' : 'border'}`} key={number} onClick={() => setPage(number)} type="button">{number}</button>
              ))}
              <ActionButton disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)} size="sm" variant="tertiary">{t('common.next')}</ActionButton>
            </div>
          )}
        </>
      )}
      {selected && <AccountDetail onClose={() => setSelected(null)} onToggle={() => setPending(selected)} user={selected} />}
      <ConfirmationDialog
        busy={busy}
        cancelLabel={t('admin.actions.cancel')}
        confirmLabel={t(pending?.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}
        description={pending ? t(pending.is_active ? 'admin.accounts.suspendDescription' : 'admin.accounts.reactivateDescription', { name: pending.name }) : ''}
        details={pending?.is_active ? (
          <label className="block text-sm font-bold">{t('admin.accounts.reason')}
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 font-normal" onChange={(event) => setReason(event.target.value)} placeholder={t('admin.accounts.reasonPlaceholder')} value={reason} />
          </label>
        ) : undefined}
        error={actionError || undefined}
        loadingLabel={t('admin.actions.working')}
        onCancel={() => { if (!busy) { setPending(null); setReason(''); setActionError('') } }}
        onConfirm={() => void applyAccess()}
        open={Boolean(pending)}
        title={pending?.is_active ? t('admin.accounts.suspendTitle') : t('admin.accounts.reactivateTitle')}
        variant={pending?.is_active ? 'danger' : 'default'}
      />
    </DashboardPage>
  )
}

function pageNumbers(meta: AccountListMeta): number[] {
  const start = Math.max(1, meta.current_page - 2)
  const end = Math.min(meta.last_page, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function AccountMenu({ user, menuKey, openKey, onToggle, onOpen, onSuspend }: {
  user: MonitoredUser
  menuKey: string
  openKey: string | null
  onToggle: (key: string | null) => void
  onOpen: () => void
  onSuspend: () => void
}) {
  const { i18n, t } = useTranslation()
  const direction = i18n.dir()
  const open = openKey === menuKey
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const gap = 8
      const viewportPadding = 8
      const panelWidth = panelRef.current?.offsetWidth ?? 176
      const panelHeight = panelRef.current?.offsetHeight ?? 84
      const preferredLeft = direction === 'rtl' ? rect.left : rect.right - panelWidth
      const left = Math.min(
        window.innerWidth - panelWidth - viewportPadding,
        Math.max(viewportPadding, preferredLeft),
      )
      const opensAbove = rect.bottom + gap + panelHeight > window.innerHeight
      const top = opensAbove
        ? Math.max(viewportPadding, rect.top - gap - panelHeight)
        : rect.bottom + gap
      setBox((current) => current?.top === top && current.left === left ? current : { top, left })
    }
    place()
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [direction, open])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onToggle(null)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onToggle(null)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onToggle])

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('admin.accounts.actions')}
        className="grid size-9 place-items-center rounded-full border border-[var(--color-border)] font-black text-[var(--color-text-secondary)] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        onClick={(event) => { event.stopPropagation(); onToggle(open ? null : menuKey) }}
        type="button"
      >
        ···
      </button>
      {open && box && createPortal(
        <div
          className="fixed z-[60] min-w-44 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
          ref={panelRef}
          role="menu"
          style={{ top: box.top, left: box.left }}
        >
          <button className="block w-full px-4 py-2 text-start text-sm font-semibold hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none" onClick={onOpen} role="menuitem" type="button">{t('admin.accounts.view')}</button>
          <button className="block w-full px-4 py-2 text-start text-sm font-semibold hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none" onClick={onSuspend} role="menuitem" type="button">{t(user.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}</button>
        </div>,
        document.body,
      )}
    </div>
  )
}

function AccountDetail({ user, onClose, onToggle }: { user: MonitoredUser; onClose: () => void; onToggle: () => void }) {
  const { i18n, t } = useTranslation()
  const localized = (item?: { name_en: string; name_ar: string } | null) => item ? (i18n.language.startsWith('ar') ? item.name_ar : item.name_en) : ''
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en'
  const isProvider = user.role === 'doctor' || user.role === 'laboratory'

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="confirmation-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div aria-modal="true" className="confirmation-dialog max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border bg-white p-6" role="dialog">
        <div className="flex items-start gap-3">
          <ProfileAvatar className="size-12 shrink-0 rounded-full text-base" imageUrl={user.profile_image_url} name={user.name} />
          <div>
            <h2 className="text-2xl font-extrabold">{user.name}</h2>
            <p className="mt-1 text-[var(--color-text-secondary)]">{t(`roles.${user.role}`)}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div><dt className="font-bold">{t('admin.table.email')}</dt><dd>{user.email}</dd></div>
          <div><dt className="font-bold">{t('admin.table.phone')}</dt><dd>{user.phone || t('admin.accounts.dash')}</dd></div>
          <div><dt className="font-bold">{t('admin.accounts.columns.status')}</dt><dd className="mt-1"><AdminStatusBadge label={t(user.is_active ? 'admin.accounts.active' : 'admin.accounts.suspended')} status={user.is_active ? 'active' : 'suspended'} /></dd></div>
          {isProvider && (
            <div><dt className="font-bold">{t('admin.accounts.columns.verification')}</dt><dd className="mt-1">{user.verification_status ? <AdminStatusBadge label={t(`verification.statuses.${user.verification_status}`)} status={user.verification_status} /> : t('admin.accounts.dash')}</dd></div>
          )}
          {user.doctor_profile && <>
            {user.doctor_profile.clinic_name ? <div><dt className="font-bold">{t('admin.users.clinicName')}</dt><dd>{user.doctor_profile.clinic_name}</dd></div> : null}
            <div><dt className="font-bold">{t('admin.providers.specialty')}</dt><dd>{localized(user.doctor_profile.specialization) || t('admin.accounts.dash')}</dd></div>
            <div><dt className="font-bold">{t('admin.providers.city')}</dt><dd>{localized(user.doctor_profile.location) || t('admin.accounts.dash')}</dd></div>
            <div><dt className="font-bold">{t('admin.labs.address')}</dt><dd>{user.doctor_profile.address || t('admin.accounts.dash')}</dd></div>
          </>}
          {user.laboratory_profile && <>
            <div><dt className="font-bold">{t('admin.users.laboratoryName')}</dt><dd>{user.laboratory_profile.name}</dd></div>
            <div><dt className="font-bold">{t('admin.labs.address')}</dt><dd>{user.laboratory_profile.address}</dd></div>
            <div><dt className="font-bold">{t('admin.providers.city')}</dt><dd>{localized(user.laboratory_profile.location) || t('admin.accounts.dash')}</dd></div>
          </>}
          <div><dt className="font-bold">{t('admin.accounts.columns.joined')}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: SUDAN_TIME_ZONE }).format(new Date(user.created_at))}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ActionButton onClick={onClose} variant="tertiary">{t('admin.actions.cancel')}</ActionButton>
          <ActionButton onClick={onToggle} variant={user.is_active ? 'danger' : 'primary'}>{t(user.is_active ? 'admin.accounts.suspend' : 'admin.accounts.reactivate')}</ActionButton>
        </div>
      </div>
    </div>
  )
}
