import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocationIcon } from '../icons/PatientHomeIcons'

interface LocationMapPreviewProps { latitude: number; longitude: number; className?: string }

export function LocationMapPreview({ latitude, longitude, className = '' }: LocationMapPreviewProps) {
  const source = useMemo(() => {
    const span = 0.006
    const bbox = [longitude - span, latitude - span, longitude + span, latitude + span].join(',')
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`
  }, [latitude, longitude])

  return <MapFrame className={className} key={source} source={source} />
}

function MapFrame({ source, className }: { source: string; className: string }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded || failed) return
    const timer = window.setTimeout(() => setFailed(true), 12000)
    return () => window.clearTimeout(timer)
  }, [failed, loaded])

  return <div className={`relative h-60 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-100 ${className}`}>
    {!failed && <iframe className="h-full w-full border-0" key={source} loading="lazy" onError={() => setFailed(true)} onLoad={() => { setLoaded(true); setFailed(false) }} referrerPolicy="no-referrer" src={source} title={t('patient.homeVisit.mapTitle')} />}
    {!loaded && !failed && <div className="absolute inset-0 grid place-items-center bg-slate-50 text-sm font-semibold text-[var(--color-text-secondary)]">{t('patient.homeVisit.mapLoading')}</div>}
    {failed && <div className="grid h-full place-items-center px-5 text-center"><div><LocationIcon className="mx-auto size-8 text-[var(--color-primary)]"/><p className="mt-3 font-bold text-emerald-700">{t('patient.homeVisit.locationCaptured')}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('patient.homeVisit.mapUnavailable')}</p></div></div>}
  </div>
}
