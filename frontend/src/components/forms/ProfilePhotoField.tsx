import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ProfileAvatar } from '../branding/ProfileAvatar'

interface ProfilePhotoFieldProps {
  file: File | null
  currentUrl?: string | null
  error?: string
  required?: boolean
  compact?: boolean
  name?: string
  onChange: (file: File | null) => void
  onRemove?: () => void
}

export function ProfilePhotoField({ file, currentUrl, error, required = false, compact = false, name = 'MedAccess', onChange, onRemove }: ProfilePhotoFieldProps) {
  const { t } = useTranslation()
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : currentUrl ?? null, [currentUrl, file])

  useEffect(() => {
    if (!file || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [file, previewUrl])

  return <fieldset className={`auth-photo-field rounded-2xl border ${error ? 'auth-input--invalid' : 'border-[var(--color-border)]'} bg-[var(--color-background)] ${compact ? 'p-2.5' : 'p-4'}`} aria-describedby={error ? 'profile-photo-error' : undefined}>
    <legend className="px-2 font-semibold text-[var(--color-text-secondary)]">{t(required ? 'profilePhoto.requiredLabel' : 'profilePhoto.optionalLabel')}</legend>
    <div className={`flex flex-wrap items-center ${compact ? 'gap-3' : 'gap-4'}`}>
      {previewUrl ? <ProfileAvatar alt={t('profilePhoto.previewAlt')} className={`${compact ? 'size-14' : 'size-24'} rounded-2xl text-2xl shadow-sm`} imageUrl={previewUrl} name={name} /> : <div aria-hidden="true" className={`grid ${compact ? 'size-14' : 'size-24'} place-items-center rounded-2xl bg-[var(--color-primary-surface)] text-3xl font-black text-[var(--color-primary)]`}>+</div>}
      <div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-full bg-[var(--color-primary)] px-4 py-2 font-bold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]"><span>{t(previewUrl ? 'profilePhoto.replace' : 'profilePhoto.choose')}</span><input accept="image/jpeg,image/png,image/webp" className="sr-only" name="profile_photo" onChange={(event) => onChange(event.target.files?.[0] ?? null)} required={required} type="file" /></label>{onRemove && previewUrl && <button className="rounded-full border border-red-200 px-4 py-2 font-bold text-red-700" onClick={onRemove} type="button">{t('profilePhoto.remove')}</button>}</div>
    </div>
    <p className={`${compact ? 'mt-1.5 text-xs' : 'mt-3 text-sm'} text-[var(--color-text-secondary)]`}>{t('profilePhoto.help')}</p>
    {error && <p className="auth-field-error" id="profile-photo-error" role="alert">{error}</p>}
  </fieldset>
}
