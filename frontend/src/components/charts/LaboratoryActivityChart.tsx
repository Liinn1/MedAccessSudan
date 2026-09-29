interface ActivityPoint {
  date: string
  count: number
  label: string
}

/** Compact request-count chart. The dataset stays chronological; dir=ltr keeps day order in RTL pages. */
export function LaboratoryActivityChart({ days, label }: { days: ActivityPoint[]; label: string }) {
  const max = Math.max(1, ...days.map((day) => day.count))
  const width = 560
  const height = 168
  const padX = 20
  const padY = 22
  const innerWidth = width - padX * 2
  const innerHeight = height - padY * 2
  const step = innerWidth / Math.max(days.length - 1, 1)
  const points = days.map((day, index) => {
    const x = padX + index * step
    const y = padY + innerHeight - (day.count / max) * innerHeight
    return `${x},${y}`
  }).join(' ')

  return (
    <div dir="ltr">
    <svg aria-label={label} className="h-40 w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = padY + innerHeight * (1 - fraction)
        return <line key={fraction} stroke="#E2E8F0" strokeWidth="1" x1={padX} x2={width - padX} y1={y} y2={y} />
      })}
      <polyline fill="none" points={points} stroke="#0F766E" strokeLinejoin="round" strokeLinecap="round" strokeWidth="3" />
      {days.map((day, index) => {
        const x = padX + index * step
        const y = padY + innerHeight - (day.count / max) * innerHeight
        return (
          <g key={day.date}>
            <circle cx={x} cy={y} fill="#0F766E" r="4" />
            <text fill="#64748B" fontSize="11" fontWeight="700" textAnchor="middle" x={x} y={height - 4}>{day.label}</text>
          </g>
        )
      })}
    </svg>
    </div>
  )
}
