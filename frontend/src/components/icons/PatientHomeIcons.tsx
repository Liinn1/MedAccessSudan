import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const defaults = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
}

export function BellIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
}

export function StethoscopeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 12v2a5 5 0 0 0 10 0v-1" /><circle cx="20" cy="10" r="2" /></svg>
}

export function VisitIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-7h6v7" /></svg>
}

export function LaboratoryIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M8 3h8M9 3v6l-4 8a3 3 0 0 0 2.7 4h8.6a3 3 0 0 0 2.7-4l-4-8V3M7 15h10" /></svg>
}

export function CalendarIcon(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
}

export function HomeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
}

export function ProfileIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
}
