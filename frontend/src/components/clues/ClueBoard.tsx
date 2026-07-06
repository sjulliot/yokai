import { useGameStore } from '../../store/useGameStore'
import { ClueColorSwatch } from './ClueColorSwatch'

interface ClueBoardProps {
  selectedClueId: string | null
  onSelectClue: (id: string | null) => void
}

/**
 * Indices révélés, étalés (pas empilés) sauf en mode `stack_clues` où seul
 * l'indice non posé avec le plus grand `order_revealed` est jouable (marqué
 * "▲"). Sélectionner un indice ici puis cliquer une carte non verrouillée du
 * plateau (en phase Indice) déclenche `place_clue` — voir `GameScreen`.
 */
export function ClueBoard({ selectedClueId, onSelectClue }: ClueBoardProps) {
  const view = useGameStore((s) => s.view)
  if (!view) return null

  const unplayed = view.revealed_clues.filter((c) => c.played_on_card_id === null)
  const topOrder =
    view.config.stack_clues && unplayed.length > 0
      ? Math.max(...unplayed.map((c) => c.order_revealed ?? -1))
      : null

  const canSelect = view.is_my_turn && view.current_turn_phase === 'clue'

  return (
    <div className="flex flex-wrap gap-2">
      {unplayed.map((clue) => {
        const isTop = topOrder === null || clue.order_revealed === topOrder
        const selectable = canSelect && isTop
        const isSelected = selectedClueId === clue.id

        return (
          <button
            key={clue.id}
            type="button"
            disabled={!selectable}
            onClick={() => onSelectClue(isSelected ? null : clue.id)}
            className={[
              'flex h-16 w-12 flex-col items-center justify-center gap-1 rounded-md border-2 text-[10px]',
              isSelected ? 'border-gold bg-gold/20' : 'border-gold/20 bg-black/20',
              !selectable ? 'opacity-70' : '',
            ].join(' ')}
          >
            <ClueColorSwatch colors={clue.colors} />
            {view.config.stack_clues && isTop && <span className="text-gold">▲</span>}
          </button>
        )
      })}
      {unplayed.length === 0 && <p className="text-xs text-paper/40">Aucun indice à poser</p>}
    </div>
  )
}
