import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/branding/BrandMark'
import { LanguageToggle } from '../../components/LanguageToggle'
import { ApiError } from '../../services/apiClient'
import { getAdminLocations, getCityProposals, getProviderApplications, resolveCityProposal, updateLocationStatus, updateProviderVerification, type AdminLocation, type CityProposal, type ProviderApplication } from '../../services/adminService'
import { getCurrentUser, logout } from '../../services/authService'

export function AdminDashboardPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<CityProposal[]>([])
  const [providers, setProviders] = useState<ProviderApplication[]>([])
  const [locations, setLocations] = useState<AdminLocation[]>([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [cityData, providerData, locationData] = await Promise.all([getCityProposals(signal), getProviderApplications(signal), getAdminLocations(signal)])
      setProposals(cityData.proposals)
      setLocations(locationData)
      setProviders(providerData)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('admin.errors.load')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getCurrentUser(controller.signal)
      .then((user) => {
        if (user.role !== 'administrator') {
          navigate('/login', { replace: true })
          return null
        }

        return load(controller.signal)
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('admin.errors.load')
      })

    return () => controller.abort()
  }, [load, navigate])
  const localized = (location: AdminLocation | ProviderApplication['specialization']) => i18n.language.startsWith('ar') ? location.name_ar : location.name_en

  async function reviewCity(proposal: CityProposal, action: 'approve' | 'map' | 'reject') {
    const name = (document.getElementById(`city-name-${proposal.id}`) as HTMLInputElement | null)?.value.trim()
    const locationId = Number((document.getElementById(`city-map-${proposal.id}`) as HTMLSelectElement | null)?.value)
    setBusy(`city-${proposal.id}`); setMessage('')
    try {
      await resolveCityProposal(proposal.id, { action, ...(action === 'approve' ? { name_en: name } : {}), ...(action === 'map' ? { location_id: locationId } : {}) })
      setMessage('admin.messages.cityUpdated'); await load()
    } catch (error) {
      setMessage(error instanceof ApiError && error.status === 422 ? 'admin.errors.validation' : 'admin.errors.action')
    } finally { setBusy('') }
  }

  async function reviewProvider(provider: ProviderApplication, status: ProviderApplication['verification_status']) {
    setBusy(`provider-${provider.id}`); setMessage('')
    try { await updateProviderVerification(provider.id, status); setMessage('admin.messages.providerUpdated'); await load() }
    catch (error) { setMessage(error instanceof ApiError && error.status === 422 ? 'admin.errors.cityUnresolved' : 'admin.errors.action') }
    finally { setBusy('') }
  }

  async function toggleLocation(location: AdminLocation) {
    setBusy(`location-${location.id}`); setMessage('')
    try { await updateLocationStatus(location.id, !location.is_active); setMessage('admin.messages.cityStatusUpdated'); await load() }
    catch { setMessage('admin.errors.action') }
    finally { setBusy('') }
  }

  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
    <header className="border-b border-[var(--color-border)] bg-white px-5 py-3"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><BrandMark compact /><div className="flex items-center gap-3"><LanguageToggle /><button className="rounded-full border border-[var(--color-border)] px-4 py-2 font-semibold hover:border-[var(--color-primary)]" onClick={async () => { await logout(); navigate('/login') }}>{t('admin.logout')}</button></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="font-bold text-[var(--color-primary)]">{t('admin.eyebrow')}</p><h1 className="mt-1 text-3xl font-extrabold">{t('admin.title')}</h1>
      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-[var(--color-text-secondary)]">{message ? t(message) : ''}</p>
      <section className="mt-5"><h2 className="text-2xl font-bold">{t('admin.cities.title')}</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">
        {proposals.length === 0 && <p className="rounded-2xl border border-[var(--color-border)] bg-white p-5">{t('admin.cities.empty')}</p>}
        {proposals.map((proposal) => <article className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={proposal.id}>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('admin.cities.provider')}: {proposal.doctor.name}</p><h3 className="mt-1 text-xl font-bold">{proposal.proposed_name}</h3>
          <label className="mt-4 block font-semibold" htmlFor={`city-name-${proposal.id}`}>{t('admin.cities.correctedName')}</label><input className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 focus:border-[var(--color-primary)] focus:outline-none" defaultValue={proposal.proposed_name} id={`city-name-${proposal.id}`} />
          <label className="mt-3 block font-semibold" htmlFor={`city-map-${proposal.id}`}>{t('admin.cities.existingMatch')}</label><select className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2" defaultValue={proposal.likely_matches[0]?.id ?? ''} id={`city-map-${proposal.id}`}><option value="">{t('admin.cities.chooseExisting')}</option>{locations.filter((location) => location.is_active).map((location) => <option key={location.id} value={location.id}>{localized(location)}</option>)}</select>
          {proposal.likely_matches.length > 0 && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('admin.cities.likely')}: {proposal.likely_matches.map(localized).join(', ')}</p>}
          <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-full bg-[var(--color-primary)] px-4 py-2 font-bold text-white disabled:opacity-50" disabled={busy === `city-${proposal.id}`} onClick={() => reviewCity(proposal, 'approve')}>{t('admin.actions.approveNew')}</button><button className="rounded-full border border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)] disabled:opacity-50" disabled={busy === `city-${proposal.id}`} onClick={() => reviewCity(proposal, 'map')}>{t('admin.actions.map')}</button><button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700 disabled:opacity-50" disabled={busy === `city-${proposal.id}`} onClick={() => reviewCity(proposal, 'reject')}>{t('admin.actions.reject')}</button></div>
        </article>)}
      </div></section>
      <section className="mt-10"><h2 className="text-2xl font-bold">{t('admin.locations.title')}</h2><div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">{locations.map((location) => <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0" key={location.id}><div><p className="font-bold">{localized(location)}</p><p className="text-sm text-[var(--color-text-secondary)]">{location.code}</p></div><button className={`rounded-full px-4 py-2 font-bold ${location.is_active ? 'border border-amber-200 text-amber-700' : 'bg-[var(--color-primary)] text-white'}`} disabled={busy === `location-${location.id}`} onClick={() => toggleLocation(location)}>{t(location.is_active ? 'admin.actions.deactivate' : 'admin.actions.activate')}</button></div>)}</div></section>
      <section className="mt-10"><h2 className="text-2xl font-bold">{t('admin.providers.title')}</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">
        {providers.length === 0 && <p className="rounded-2xl border border-[var(--color-border)] bg-white p-5">{t('admin.providers.empty')}</p>}
        {providers.map((provider) => <article className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm" key={provider.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{provider.user.name}</h3><p className="text-sm text-[var(--color-text-secondary)]">{provider.user.email}</p></div><span className="rounded-full bg-[var(--color-primary-surface)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">{t(`admin.statuses.${provider.verification_status}`)}</span></div><dl className="mt-4 grid gap-2 text-sm"><div><dt className="font-bold">{t('admin.providers.specialty')}</dt><dd>{localized(provider.specialization)}</dd></div><div><dt className="font-bold">{t('admin.providers.city')}</dt><dd>{provider.location ? localized(provider.location) : provider.city_proposal?.proposed_name ?? t('admin.providers.unresolved')}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-full bg-[var(--color-primary)] px-4 py-2 font-bold text-white disabled:opacity-50" disabled={busy === `provider-${provider.id}`} onClick={() => reviewProvider(provider, 'verified')}>{t('admin.actions.verify')}</button><button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700 disabled:opacity-50" disabled={busy === `provider-${provider.id}`} onClick={() => reviewProvider(provider, 'rejected')}>{t('admin.actions.reject')}</button><button className="rounded-full border border-amber-200 px-4 py-2 font-bold text-amber-700 disabled:opacity-50" disabled={busy === `provider-${provider.id}`} onClick={() => reviewProvider(provider, 'suspended')}>{t('admin.actions.suspend')}</button></div></article>)}
      </div></section>
    </main>
  </div>
}
