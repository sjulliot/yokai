import { useEffect, useState } from 'react'

interface TimerBadgeProps {
  deadline: number | null
  label: string
}

function formatRemaining(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const ss = (total % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

/** Compte à rebours local recalculé chaque seconde à partir d'un deadline epoch (secondes). */
export function TimerBadge({ deadline, label }: TimerBadgeProps) {
  const [now, setNow] = useState(() => Date.now() / 1000)

  useEffect(() => {
    if (deadline == null) return
    const id = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (deadline == null) return null

  const remaining = deadline - now
  const isUrgent = remaining <= 10

  return (
    <div
      className={`rounded-full border px-2 py-1 text-xs ${
        isUrgent ? 'border-lacquer text-lacquer' : 'border-gold/30 text-paper/70'
      }`}
    >
      {label} : {formatRemaining(remaining)}
    </div>
  )
}
