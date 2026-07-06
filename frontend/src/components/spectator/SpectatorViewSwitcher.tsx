import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

/**
 * Affiché uniquement pour un spectateur : bandeau "Mode spectateur" +
 * sélecteur de point de vue (omniscient ou celui d'un joueur précis).
 */
export function SpectatorViewSwitcher() {
  const view = useGameStore((s) => s.view)
  const { send } = useWebSocket()
  if (!view || view.my_role !== 'spectator') return null

  function handleChange(value: string) {
    send({ type: 'set_spectator_view', payload: { target: value === 'omniscient' ? null : value } })
  }

  return (
    <div className="flex items-center gap-2 rounded border border-gold/30 bg-lacquer/10 px-3 py-1 text-xs">
      <span className="font-semibold text-gold">Mode spectateur</span>
      {view.viewing_as && <span className="text-paper/70">— vous voyez comme {view.viewing_as}</span>}
      <select
        value={view.viewing_as ?? 'omniscient'}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded border border-gold/30 bg-ink px-2 py-1 text-paper"
      >
        <option value="omniscient">Vue omnisciente</option>
        {view.players_order.map((pseudo) => (
          <option key={pseudo} value={pseudo}>
            Voir comme {pseudo}
          </option>
        ))}
      </select>
    </div>
  )
}
