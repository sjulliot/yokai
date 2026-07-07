import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useGameStore } from '../../store/useGameStore'
import type { ClueView } from '../../types/protocol'
import { ClueColorSwatch } from './ClueColorSwatch'

interface ClueBoardProps {
  selectedClueId: string | null
  onSelectClue: (id: string | null) => void
}

/**
 * Indices révélés, étalés (pas empilés) sauf en mode `stack_clues` où seul
 * l'indice non posé avec le plus grand `order_revealed` est jouable (marqué
 * "▲"). Un indice jouable peut être posé de deux façons équivalentes :
 * sélection ici puis clic sur une carte (`GameScreen::handleCardActivate`),
 * ou glisser-déposer directement sur la carte (`GameScreen::handleDragEnd`).
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
          <ClueTile
            key={clue.id}
            clue={clue}
            selectable={selectable}
            isSelected={isSelected}
            showStackMarker={view.config.stack_clues && isTop}
            onSelect={() => onSelectClue(isSelected ? null : clue.id)}
          />
        )
      })}
      {unplayed.length === 0 && <p className="text-xs text-paper/40">Aucun indice à poser</p>}
    </div>
  )
}

interface ClueTileProps {
  clue: ClueView
  selectable: boolean
  isSelected: boolean
  showStackMarker: boolean
  onSelect: () => void
}

function ClueTile({ clue, selectable, isSelected, showStackMarker, onSelect }: ClueTileProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `clue-${clue.id}`,
    data: { clueId: clue.id },
    disabled: !selectable,
  })

  const style: CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 20 : undefined,
    cursor: selectable ? 'grab' : 'default',
    touchAction: selectable ? 'none' : undefined,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      {...(selectable ? listeners : {})}
      {...(selectable ? attributes : {})}
      className={[
        'flex h-16 w-12 flex-col items-center justify-center gap-1 rounded-md border-2 text-[10px]',
        isSelected ? 'border-gold bg-gold/20' : 'border-gold/20 bg-black/20',
        !selectable ? 'opacity-70' : '',
      ].join(' ')}
    >
      <ClueColorSwatch colors={clue.colors} />
      {showStackMarker && <span className="text-gold">▲</span>}
    </button>
  )
}
