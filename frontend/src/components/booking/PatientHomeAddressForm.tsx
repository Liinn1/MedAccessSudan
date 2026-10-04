import { useTranslation } from 'react-i18next'
import { LocationIcon } from '../icons/PatientHomeIcons'
import { LocationMapPreview } from '../patient/LocationMapPreview'

export type PatientHomeAddress = {
  contact_phone: string
  area: string
  address_details: string
  additional_directions: string
}

export type HomeCoordinates = {
  latitude: number
  longitude: number
  accuracy: number
}

const emptyAddress: PatientHomeAddress = {
  contact_phone: '',
  area: '',
  address_details: '',
  additional_directions: '',
}

export function createEmptyHomeAddress(contactPhone = ''): PatientHomeAddress {
  return { ...emptyAddress, contact_phone: contactPhone }
}

export function PatientHomeAddressForm({
  address,
  cityName,
  coordinates,
  locating,
  locationError,
  onCaptureLocation,
  onChange,
  onChangeCity,
  requireCoordinates = false,
  showContactPhone = false,
  title,
}: {
  address: PatientHomeAddress
  cityName: string
  coordinates?: HomeCoordinates | null
  locating?: boolean
  locationError?: string
  onCaptureLocation?: () => void
  onChange: (next: PatientHomeAddress) => void
  onChangeCity?: () => void
  requireCoordinates?: boolean
  showContactPhone?: boolean
  title: string
}) {
  const { t } = useTranslation()
  const update = (key: keyof PatientHomeAddress, value: string) => onChange({ ...address, [key]: value })

  return (
    <>
      <h3 className="text-xl font-extrabold">{title}</h3>
      {requireCoordinates && onCaptureLocation && (
        <section className={`rounded-2xl border p-4 ${coordinates ? 'border-emerald-200 bg-emerald-50' : 'border-teal-100 bg-[var(--color-primary-surface)]'}`}>
          {coordinates && <LocationMapPreview className="mb-4" latitude={coordinates.latitude} longitude={coordinates.longitude} />}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-[var(--color-primary)]"><LocationIcon className="size-6" /></span>
              <div>
                <p className="font-extrabold">{t(coordinates ? 'patient.homeVisit.locationCaptured' : 'patient.homeVisit.useLocation')}</p>
                {coordinates && <p className="text-sm text-emerald-800">{t('patient.homeVisit.locationProvided')}</p>}
              </div>
            </div>
            <button className="min-h-11 rounded-full border border-[var(--color-primary)] bg-white px-5 font-bold text-[var(--color-primary)] disabled:opacity-60" disabled={locating} onClick={onCaptureLocation} type="button">
              {t(locating ? 'patient.homeVisit.gettingLocation' : coordinates ? 'patient.homeVisit.updateLocation' : 'patient.homeVisit.useLocation')}
            </button>
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-red-700">{locationError}</p>
        </section>
      )}
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-bold text-[var(--color-text-secondary)]">{t('patient.homeVisit.city')}</p>
        <p className="mt-1 font-extrabold">{cityName}</p>
        {onChangeCity && (
          <button className="mt-2 text-sm font-bold text-[var(--color-primary)]" onClick={onChangeCity} type="button">
            {t('patient.homeVisit.changeCity')}
          </button>
        )}
      </div>
      <div className={`grid gap-4 ${showContactPhone ? 'sm:grid-cols-2' : ''}`}>
        {showContactPhone && (
          <label className="font-semibold">{t('patient.homeVisit.fields.contact_phone')} *
            <input className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] px-4" maxLength={30} onChange={(event) => update('contact_phone', event.target.value)} required type="tel" value={address.contact_phone} />
          </label>
        )}
        <label className="font-semibold">{t('patient.homeVisit.fields.area')} *
          <input className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--color-border)] px-4" maxLength={255} onChange={(event) => update('area', event.target.value)} placeholder={t('patient.homeVisit.placeholders.area')} required value={address.area} />
        </label>
      </div>
      <label className="font-semibold">{t('patient.homeVisit.fields.address_details')} *
        <textarea className="mt-2 block min-h-24 w-full rounded-xl border border-[var(--color-border)] px-4 py-3" maxLength={500} onChange={(event) => update('address_details', event.target.value)} placeholder={t('patient.homeVisit.placeholders.address_details')} required value={address.address_details} />
      </label>
      <label className="font-semibold">{t('patient.homeVisit.fields.additional_directions')}
        <textarea className="mt-2 block min-h-20 w-full rounded-xl border border-[var(--color-border)] px-4 py-3" maxLength={2000} onChange={(event) => update('additional_directions', event.target.value)} placeholder={t('patient.homeVisit.placeholders.additional_directions')} value={address.additional_directions} />
      </label>
    </>
  )
}
