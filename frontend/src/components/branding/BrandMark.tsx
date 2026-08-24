import demoLogo from '../../assets/branding/medaccess-sudan-demo.png'

interface BrandMarkProps {
  compact?: boolean
}

/** Temporary shared brand asset; replace the imported image when the final logo is approved. */
export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`mx-auto object-contain ${compact ? 'h-16 w-32' : 'h-16 w-32 [@media(min-height:760px)]:h-20 [@media(min-height:760px)]:w-40'}`}
      src={demoLogo}
    />
  )
}
