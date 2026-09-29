type BotanicalVariant = 'about' | 'phone' | 'contact' | 'auth' | 'authForeground'
type LeafShape = 'broad' | 'narrow' | 'rounded' | 'outline'
type LeafTone = 'mint' | 'teal' | 'deep' | 'cream'

interface LeafDefinition {
  shape: LeafShape
  tone: LeafTone
  transform: string
  opacity?: number
}

// Each section reuses the same leaf vocabulary but has its own art-directed
// transforms. This avoids copying SVG markup while keeping compositions distinct.
const clusters: Record<BotanicalVariant, LeafDefinition[]> = {
  about: [
    { shape: 'broad', tone: 'mint', transform: 'translate(126 348) rotate(-44) scale(.82)' },
    { shape: 'narrow', tone: 'teal', transform: 'translate(176 366) rotate(-17) scale(.72)', opacity: 0.82 },
    { shape: 'rounded', tone: 'cream', transform: 'translate(84 326) rotate(-76) scale(.58)' },
    { shape: 'outline', tone: 'deep', transform: 'translate(208 372) rotate(18) scale(.52)', opacity: 0.5 },
    { shape: 'rounded', tone: 'mint', transform: 'translate(510 148) rotate(42) scale(.55)', opacity: 0.78 },
  ],
  phone: [
    { shape: 'broad', tone: 'mint', transform: 'translate(286 456) rotate(-48) scale(1.2)' },
    { shape: 'narrow', tone: 'teal', transform: 'translate(300 462) rotate(-24) scale(1.16)', opacity: 0.9 },
    { shape: 'rounded', tone: 'deep', transform: 'translate(276 451) rotate(-66) scale(.72)', opacity: 0.7 },
    { shape: 'broad', tone: 'teal', transform: 'translate(326 456) rotate(48) scale(1.02)', opacity: 0.7 },
    { shape: 'narrow', tone: 'mint', transform: 'translate(316 462) rotate(24) scale(1.18)' },
    { shape: 'rounded', tone: 'cream', transform: 'translate(375 454) rotate(62) scale(.56)', opacity: 0.94 },
    { shape: 'outline', tone: 'deep', transform: 'translate(332 460) rotate(55) scale(.72)', opacity: 0.48 },
    { shape: 'broad', tone: 'mint', transform: 'translate(307 472) rotate(4) scale(.66)', opacity: 0.72 },
  ],
  contact: [
    { shape: 'broad', tone: 'mint', transform: 'translate(112 436) rotate(-56) scale(1.08)', opacity: 0.88 },
    { shape: 'rounded', tone: 'teal', transform: 'translate(58 398) rotate(-94) scale(.7)', opacity: 0.72 },
    { shape: 'narrow', tone: 'deep', transform: 'translate(182 470) rotate(-24) scale(.85)', opacity: 0.54 },
    { shape: 'broad', tone: 'cream', transform: 'translate(526 174) rotate(64) scale(.85)', opacity: 0.9 },
    { shape: 'narrow', tone: 'mint', transform: 'translate(560 220) rotate(48) scale(.68)', opacity: 0.82 },
    { shape: 'outline', tone: 'deep', transform: 'translate(490 202) rotate(38) scale(.62)', opacity: 0.42 },
  ],
  // Rear foliage fans up from the lower composition so stems sit behind the cream wave.
  auth: [
    { shape: 'broad', tone: 'mint', transform: 'translate(148 452) rotate(-50) scale(1.08)', opacity: 0.92 },
    { shape: 'narrow', tone: 'teal', transform: 'translate(178 456) rotate(-28) scale(0.9)', opacity: 0.86 },
    { shape: 'rounded', tone: 'deep', transform: 'translate(112 446) rotate(-72) scale(0.58)', opacity: 0.62 },
    { shape: 'outline', tone: 'deep', transform: 'translate(206 458) rotate(-8) scale(0.46)', opacity: 0.4 },
    { shape: 'broad', tone: 'teal', transform: 'translate(452 452) rotate(48) scale(1.04)', opacity: 0.9 },
    { shape: 'narrow', tone: 'mint', transform: 'translate(422 456) rotate(26) scale(0.88)', opacity: 0.84 },
    { shape: 'rounded', tone: 'cream', transform: 'translate(498 446) rotate(64) scale(0.54)', opacity: 0.94 },
    { shape: 'outline', tone: 'deep', transform: 'translate(394 458) rotate(10) scale(0.44)', opacity: 0.38 },
  ],
  // Hem-level leaves stay below the shoulders and are partly tucked under the wave.
  authForeground: [
    { shape: 'rounded', tone: 'cream', transform: 'translate(228 462) rotate(-30) scale(0.4)', opacity: 0.9 },
    { shape: 'narrow', tone: 'mint', transform: 'translate(372 462) rotate(28) scale(0.38)', opacity: 0.82 },
  ],
}

const leafPaths: Record<Exclude<LeafShape, 'outline'>, string> = {
  broad: 'M0 0C-70-46-95-137-55-214C37-190 83-111 54-28C40-13 22-4 0 0Z',
  narrow: 'M0 0C-35-91-23-196 30-278C83-171 73-67 0 0Z',
  rounded: 'M0 0C-86-19-137-92-116-174C-25-180 48-119 47-37C34-18 18-6 0 0Z',
}

const toneClass: Record<LeafTone, string> = {
  mint: 'botanical-leaf--mint',
  teal: 'botanical-leaf--teal',
  deep: 'botanical-leaf--deep',
  cream: 'botanical-leaf--cream',
}

function BotanicalLeaf({ shape, tone, transform, opacity = 1 }: LeafDefinition) {
  const outline = shape === 'outline'
  const path = outline ? leafPaths.narrow : leafPaths[shape]

  return (
    <g className={`botanical-leaf ${toneClass[tone]} ${outline ? 'botanical-leaf--outline' : ''}`} opacity={opacity} transform={transform}>
      <path className="botanical-leaf__body" d={path} />
      <path className="botanical-leaf__vein" d={shape === 'rounded' ? 'M0 0C-29-57-58-108-94-154' : 'M0 0C8-76 17-151 28-236'} />
      {!outline && (
        <>
          <path className="botanical-leaf__detail" d={shape === 'rounded' ? 'M-28-61L-76-76M-48-102L-89-119' : 'M11-66L-30-91M17-112L58-143M22-159L-13-190'} />
          <path className="botanical-leaf__highlight" d={shape === 'broad' ? 'M-32-178C-4-173 22-159 39-137' : 'M5-40C29-61 44-88 50-119'} />
        </>
      )}
    </g>
  )
}

/** Decorative only: SVG stays out of the accessibility tree and never receives input. */
export function BotanicalDecoration({ variant, className = '' }: { variant: BotanicalVariant; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`botanical-cluster botanical-cluster--${variant} ${className}`}
      fill="none"
      focusable="false"
      viewBox="0 0 600 480"
    >
      {clusters[variant].map((leaf, index) => <BotanicalLeaf {...leaf} key={`${leaf.shape}-${index}`} />)}
    </svg>
  )
}
