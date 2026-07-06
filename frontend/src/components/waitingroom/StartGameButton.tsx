import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

const MIN_PLAYERS = 2

/** Bouton de lancement de partie, désactivé tant qu'il manque des joueurs. */
export function StartGameButton() {
  const numPlayers = useGameStore((s) => s.view?.connected_players.length ?? 0)
  const { send } = useWebSocket()

  const canStart = numPlayers >= MIN_PLAYERS

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={!canStart}
        onClick={() => send({ type: 'start_game', payload: {} })}
        className="rounded bg-lacquer px-6 py-3 font-display text-lg text-paper transition-colors hover:bg-lacquer/80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lacquer"
      >
        Lancer la partie
      </button>
      {!canStart && <p className="text-sm text-paper/60">Il faut au moins 2 joueurs</p>}
    </div>
  )
}
