import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

/** Pioche de cartes Indice. Cliquable pour en révéler une pendant sa phase Indice. */
export function CluePile() {
  const view = useGameStore((s) => s.view)
  const { send } = useWebSocket()
  if (!view) return null

  const canReveal = view.is_my_turn && view.current_turn_phase === 'clue' && view.clue_pile_remaining > 0

  return (
    <button
      type="button"
      disabled={!canReveal}
      onClick={() => send({ type: 'game_action', payload: { action: 'reveal_clue' } })}
      className={`flex h-20 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 text-xs ${
        canReveal
          ? 'border-gold bg-lacquer/40 hover:bg-lacquer/60'
          : 'border-gold/20 bg-black/20 text-paper/50 opacity-70'
      }`}
    >
      <span className="text-lg">🀫</span>
      <span>{view.clue_pile_remaining}</span>
    </button>
  )
}
