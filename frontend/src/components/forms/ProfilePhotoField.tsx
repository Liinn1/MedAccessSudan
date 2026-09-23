import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ProfilePhotoFieldProps {
  file: File | null
  currentUrl?: string | null
  error?: string
  required?: boolean
  compact?: boolean
  onChange: (file: File | null) => void
  onRemove?: () => void
}

export function ProfilePhotoField({ file, currentUrl, error, required = false, compact = false, onChange, onRemove }: ProfilePhotoFieldProps) {
  const { t } = useTranslation()
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : currentUrl ?? null, [currentUrl, file])

  useEffect(() => {
    if (!file || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [file, previewUrl])

  return <fieldset className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] ${compact ? 'p-3' : 'p-4'}`} aria-describedby={error ? 'profile-photo-error' : undefined}>
    <legend className="px-2 font-semibold text-[var(--color-text-secondary)]">{t(required ? 'profilePhoto.requiredLabel' : 'profilePhoto.optionalLabel')}</legend>
    <div className="flex flex-wrap items-center gap-4">
      {previewUrl ? <img alt={t('profilePhoto.previewAlt')} className={`${compact ? 'size-18' : 'size-24'} rounded-2xl object-cover shadow-sm`} src={previewUrl} /> : <div aria-hidden="true" className={`grid ${compact ? 'size-18' : 'size-24'} place-items-center rounded-2xl bg-[var(--color-primary-surface)] text-3xl font-black text-[var(--color-primary)]`}>+</div>}
      <div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-full bg-[var(--color-primary)] px-4 py-2 font-bold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]"><span>{t(previewUrl ? 'profilePhoto.replace' : 'profilePhoto.choose')}</span><input accept="image/jpeg,image/png,image/webp" className="sr-only" name="profile_photo" onChange={(event) => onChange(event.target.files?.[0] ?? null)} required={required} type="file" /></label>{onRemove && previewUrl && <button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700" onClick={onRemove} type="button">{t('profilePhoto.remove')}</button>}</div>
    </div>
    <p className={`${compact ? 'mt-2' : 'mt-3'} text-sm text-[var(--color-text-secondary)]`}>{t('profilePhoto.help')}</p>
    {error && <p className="mt-2 text-sm font-semibold text-red-700" id="profile-photo-error" role="alert">{error}</p>}
  </fieldset>
}
