interface WeeklyBarPoint {
  label: string
  completed: number
  upcoming: number
  cancelled: number
}

export function AppointmentOverviewChart({ days }: { days: WeeklyBarPoint[] }) {
  const max = Math.max(1, ...days.map((day) => day.completed + day.upcoming + day.cancelled))
  const width = 560
  const height = 180
  const pad = 28
  const innerWidth = width - pad * 2
  const innerHeight = height - pad * 1.6
  const groupWidth = innerWidth / Math.max(days.length, 1)

  return (
    <svg className="h-44 w-full" viewBox={`0 0 ${width} ${height}`} role="img">
      {days.map((day, index) => {
        const x = pad + index * groupWidth
        const barWidth = Math.max(8, groupWidth * 0.22)
        const gap = 3
        const completedH = (day.completed / max) * innerHeight
        const upcomingH = (day.upcoming / max) * innerHeight
        const cancelledH = (day.cancelled / max) * innerHeight
        const base = height - pad
        return (
          <g key={day.label}>
            <rect fill="#0F766E" height={completedH} rx="4" width={barWidth} x={x} y={base - completedH} />
            <rect fill="#5EEAD4" height={upcomingH} rx="4" width={barWidth} x={x + barWidth + gap} y={base - upcomingH} />
            <rect fill="#F87171" height={cancelledH} rx="4" width={barWidth} x={x + (barWidth + gap) * 2} y={base - cancelledH} />
            <text fill="#64748B" fontSize="11" fontWeight="700" textAnchor="middle" x={x + groupWidth * 0.38} y={height - 8}>{day.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function SlotUtilizationChart({ available, booked, bookedLabel, availableLabel }: { available: number; booked: number; bookedLabel: string; availableLabel: string }) {
  const total = booked + available
  const percent = total === 0 ? 0 : Math.round((booked / total) * 100)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const bookedLength = total === 0 ? 0 : (booked / total) * circumference

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg className="size-40" viewBox="0 0 140 140" role="img">
        <circle cx="70" cy="70" fill="none" r={radius} stroke="#E2E8F0" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          fill="none"
          r={radius}
          stroke="#0F766E"
          strokeDasharray={`${bookedLength} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="14"
          transform="rotate(-90 70 70)"
        />
        <text fill="#0F172A" fontSize="22" fontWeight="800" textAnchor="middle" x="70" y="68">{percent}%</text>
        <text fill="#64748B" fontSize="11" fontWeight="700" textAnchor="middle" x="70" y="86">{bookedLabel}</text>
      </svg>
      <dl className="grid gap-2 text-sm">
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#0F766E]" /><dt className="text-[var(--color-text-secondary)]">{bookedLabel}</dt><dd className="font-extrabold">{booked}</dd></div>
        <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-slate-200" /><dt className="text-[var(--color-text-secondary)]">{availableLabel}</dt><dd className="font-extrabold">{available}</dd></div>
      </dl>
    </div>
  )
}
