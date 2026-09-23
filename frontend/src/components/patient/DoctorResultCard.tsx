import { useTranslation } from 'react-i18next'
import { LocationIcon } from '../icons/PatientHomeIcons'
import type { DoctorSummary } from '../../services/doctorService'
import { SUDAN_TIME_ZONE } from '../../utils/dateTime'

interface Props { doctor: DoctorSummary; onViewProfile: () => void }

export function DoctorResultCard({ doctor, onViewProfile }: Props) {
  const { t, i18n } = useTranslation()
  const arabic = i18n.resolvedLanguage === 'ar'
  const initials = doctor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const availability = doctor.next_available_at
    ? new Intl.DateTimeFormat(arabic ? 'ar-SD' : 'en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: SUDAN_TIME_ZONE }).format(new Date(doctor.next_available_at))
    : t('patient.searchResults.noAvailability')

  return <article className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"><div className="flex items-start gap-4">{doctor.profile_image_url ? <img alt="" className="size-16 shrink-0 rounded-full object-cover" src={doctor.profile_image_url} /> : <div aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--color-primary-surface)] text-lg font-black text-[var(--color-primary)]">{initials}</div>}<div className="min-w-0 flex-1"><h2 className="text-xl font-extrabold">{doctor.name}</h2><p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{arabic ? doctor.specialization.name_ar : doctor.specialization.name_en}</p><p className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><LocationIcon className="size-4 shrink-0 text-[var(--color-primary)]" />{doctor.clinic_name || (doctor.location ? (arabic ? doctor.location.name_ar : doctor.location.name_en) : '')}</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4"><div><span className="block text-xs font-bold uppercase tracking-wide text-emerald-700">{t('patient.searchResults.available')}</span><span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{availability}</span></div><button className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" onClick={onViewProfile} type="button">{t('patient.searchResults.selectDoctor')}</button></div></article>
}
