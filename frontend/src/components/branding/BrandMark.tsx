import medAccessLogo from '../../assets/branding/medaccess-logo.png'

interface BrandMarkProps {
  compact?: boolean
  variant?: 'navbar' | 'auth' | 'footer'
}

const variantClasses = {
  navbar: 'size-12',
  auth: 'size-24',
  footer: 'size-14',
} as const

export function BrandMark({ variant = 'navbar' }: BrandMarkProps) {
  if (variant === 'auth') {
    return (
      <span aria-hidden="true" className={`block shrink-0 overflow-hidden rounded-2xl ${variantClasses.auth}`}>
        <img alt="" className="size-full object-contain" src={medAccessLogo} />
      </span>
    )
  }

  return (
    <img alt="" aria-hidden="true" className={`block shrink-0 object-contain ${variantClasses[variant]}`} src={medAccessLogo} />
  )
}
