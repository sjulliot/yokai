import { useGameStore } from '../../store/useGameStore'

/** Bannière indiquant le joueur actif, mise en valeur si c'est nous. */
export function TurnBanner() {
  const view = useGameStore((s) => s.view)
  if (!view) return null

  return view.is_my_turn ? (
    <span className="inline-flex animate-pulse items-center gap-2 rounded-full border border-gold bg-gold/20 px-3 py-1 text-sm font-semibold text-gold shadow-[0_0_12px_rgba(212,166,87,0.4)]">
      <span className="h-2 w-2 rounded-full bg-gold" />
      À vous de jouer
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-black/20 px-3 py-1 text-sm text-paper/60">
      <span className="h-2 w-2 rounded-full bg-paper/20" />
      Tour de <span className="font-semibold text-paper/80">{view.current_player ?? '—'}</span>
    </span>
  )
}
