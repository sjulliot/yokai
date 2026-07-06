import { useGameStore } from '../../store/useGameStore'
import type { TurnPhase } from '../../types/protocol'

const STEPS: { phase: TurnPhase; label: string }[] = [
  { phase: 'observe', label: 'Observer' },
  { phase: 'move', label: 'Déplacer' },
  { phase: 'clue', label: 'Indice' },
]

/** Stepper visuel à 3 étapes du tour courant. */
export function PhaseStepper() {
  const currentPhase = useGameStore((s) => s.view?.current_turn_phase ?? null)
  const currentIndex = currentPhase ? STEPS.findIndex((step) => step.phase === currentPhase) : -1

  if (currentIndex < 0) return null

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <li key={step.phase} className="flex items-center gap-2">
            <span
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full border',
                isCurrent
                  ? 'border-gold bg-gold text-ink'
                  : isDone
                    ? 'border-gold/50 bg-gold/20 text-gold'
                    : 'border-gold/20 text-paper/40',
              ].join(' ')}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className={isCurrent ? 'text-gold' : 'text-paper/50'}>{step.label}</span>
            {i < STEPS.length - 1 && <span className="text-paper/20">→</span>}
          </li>
        )
      })}
    </ol>
  )
}
