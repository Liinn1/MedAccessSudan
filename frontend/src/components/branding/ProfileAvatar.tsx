import { useState } from 'react'

interface ProfileAvatarProps {
  name: string
  imageUrl?: string | null
  className: string
  alt?: string
}

function initialsFor(name: string): string {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return initials || 'MA'
}

export function ProfileAvatar({ name, imageUrl, className, alt = '' }: ProfileAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (imageUrl && failedUrl !== imageUrl) {
    return <img alt={alt} className={`object-cover ${className}`} onError={() => setFailedUrl(imageUrl)} src={imageUrl} />
  }

  return <span aria-label={alt || name} className={`grid place-items-center bg-[var(--color-primary)] font-black text-white ${className}`} role="img">{initialsFor(name)}</span>
}
