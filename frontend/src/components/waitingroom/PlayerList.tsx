import { useGameStore } from '../../store/useGameStore'

/**
 * Liste des joueurs connectés. Si `players_order` contient un joueur absent
 * de `connected_players` (déconnexion temporaire), il est affiché en fin de
 * liste avec un badge "déconnecté".
 */
export function PlayerList() {
  const connected = useGameStore((s) => s.view?.connected_players ?? [])
  const order = useGameStore((s) => s.view?.players_order ?? [])
  const myPseudo = useGameStore((s) => s.view?.my_pseudo)

  const disconnected = order.filter((pseudo) => !connected.includes(pseudo))
  const all = [...connected, ...disconnected]

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg text-gold">Joueurs</h2>
      <ul className="space-y-1">
        {all.map((pseudo) => {
          const isDisconnected = disconnected.includes(pseudo)
          return (
            <li
              key={pseudo}
              className={`flex items-center justify-between rounded border px-3 py-2 ${
                isDisconnected ? 'border-lacquer/40 text-paper/50' : 'border-gold/20'
              }`}
            >
              <span>
                {pseudo}
                {pseudo === myPseudo ? ' (toi)' : ''}
              </span>
              {isDisconnected && (
                <span className="text-xs uppercase tracking-wide text-lacquer">déconnecté</span>
              )}
            </li>
          )
        })}
        {all.length === 0 && <li className="text-paper/50">En attente de joueurs…</li>}
      </ul>
    </section>
  )
}
