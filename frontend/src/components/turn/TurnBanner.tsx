import { useGameStore } from '../../store/useGameStore'

/** Bannière indiquant le joueur actif, mise en valeur si c'est nous. */
export function TurnBanner() {
  const view = useGameStore((s) => s.view)
  if (!view) return null

  return (
    <p className="text-sm">
      {view.is_my_turn ? (
        <span className="font-semibold text-gold">À vous de jouer</span>
      ) : (
        <span className="text-paper/70">
          Tour de <span className="font-semibold text-paper">{view.current_player ?? '—'}</span>
        </span>
      )}
    </p>
  )
}
