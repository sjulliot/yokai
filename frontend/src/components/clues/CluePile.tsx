import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useHistorySnapshot } from '../../hooks/useHistorySnapshot'

/**
 * Pioche de cartes Indice. Cliquable pour en révéler une pendant sa phase Indice.
 *
 * En mode historique, le compteur affiché est celui reconstruit à `historyIndex` (nombre
 * d'indices non encore révélés à ce moment-là de la partie), et l'action est désactivée.
 */
export function CluePile() {
  const view = useGameStore((s) => s.view)
  const { send } = useWebSocket()
  const { isHistory, snapshot } = useHistorySnapshot()
  if (!view) return null

  const totalClues = view.config.clue_counts[1] + view.config.clue_counts[2] + view.config.clue_counts[3]
  const remaining =
    isHistory && snapshot ? totalClues - snapshot.revealedClueIds.size : view.clue_pile_remaining

  const canReveal =
    !isHistory && view.is_my_turn && view.current_turn_phase === 'clue' && remaining > 0

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
      <span>{remaining}</span>
    </button>
  )
}
