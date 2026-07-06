import { useGameStore } from '../../store/useGameStore'

/** Liste des joueurs avec indication du joueur actif et des déconnectés. */
export function PlayerList() {
  const view = useGameStore((s) => s.view)
  if (!view) return null

  return (
    <ul className="space-y-1 text-sm">
      {view.players_order.map((pseudo) => {
        const isActive = pseudo === view.current_player
        const isConnected = view.connected_players.includes(pseudo)
        return (
          <li
            key={pseudo}
            className={`flex items-center justify-between rounded px-2 py-1 ${
              isActive ? 'bg-gold/10 text-gold' : 'text-paper/80'
            }`}
          >
            <span>
              {pseudo}
              {!isConnected && <span className="ml-1 text-xs text-paper/40">(déconnecté)</span>}
            </span>
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-paper/20'}`} />
          </li>
        )
      })}
    </ul>
  )
}
