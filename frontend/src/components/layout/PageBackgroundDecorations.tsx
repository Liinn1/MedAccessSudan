interface PageBackgroundDecorationsProps {
  className?: string
}

export function PageBackgroundDecorations({ className = '' }: PageBackgroundDecorationsProps) {
  return (
    <div aria-hidden="true" className={`page-background-decorations pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      <span className="page-background-shape page-background-shape--halo" />
      <span className="page-background-shape page-background-shape--orb" />
      <span className="page-background-shape page-background-shape--arc" />
    </div>
  )
}
