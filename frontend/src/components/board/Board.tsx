import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { useUiStore } from '../../store/useUiStore'
import type { CardView } from '../../types/protocol'
import { YokaiCard } from './YokaiCard'
import { DropZone } from './DropZone'
import { reconstructBoardAtSeq } from '../history/reconstructBoard'

interface BoardProps {
  onCardActivate: (cardId: number) => void
}

function keyOf(row: number, col: number): string {
  return `${row},${col}`
}

/**
 * Plateau de jeu : grille CSS Grid dimensionnée dynamiquement sur la
 * bounding box des cartes + une case de marge tout autour (zones de drop
 * potentielles). Le plateau n'est pas une grille rectangulaire figée : les
 * cartes peuvent changer de forme au fil des déplacements. La validation
 * finale d'un déplacement reste toujours côté serveur.
 *
 * En mode historique (`useUiStore.viewMode === 'history'`), les positions et
 * verrouillages affichés sont ceux reconstruits à `historyIndex` plutôt que
 * l'état live — un seul arbre de `YokaiCard` (même `layoutId` Framer Motion)
 * reste monté dans les deux cas, ce qui permet à l'animation FLIP existante
 * de jouer automatiquement la transition entre deux instants de l'historique.
 */
export function Board({ onCardActivate }: BoardProps) {
  const view = useGameStore((s) => s.view)
  const viewMode = useUiStore((s) => s.viewMode)
  const historyIndex = useUiStore((s) => s.historyIndex)
  const entries = useHistoryStore((s) => s.entries)

  const isHistory = viewMode === 'history'

  const reconstructed = useMemo(() => {
    if (!isHistory || historyIndex === null) return null
    return reconstructBoardAtSeq(entries, historyIndex)
  }, [isHistory, historyIndex, entries])

  // Carte concernée par l'étape d'historique actuellement affichée (observe/move/place_clue) :
  // mise en évidence pour qu'on sache immédiatement quelle carte a été touchée à ce tour-là,
  // en plus des badges "déjà observée par" qui, eux, s'accumulent sur toute la partie.
  const highlightedCardId = useMemo(() => {
    if (!isHistory || historyIndex === null) return null
    const entry = entries.find((e) => e.seq === historyIndex)
    const cardId = entry?.details.card_id
    return typeof cardId === 'number' ? cardId : null
  }, [isHistory, historyIndex, entries])

  const displayCards = useMemo<CardView[]>(() => {
    const cards = view?.cards ?? []
    if (!isHistory || !reconstructed) return cards
    return cards.map((card) => ({
      ...card,
      position: reconstructed.positions.get(card.id) ?? card.position,
      is_locked: reconstructed.lockedCardIds.has(card.id),
      observed_by: reconstructed.observedBy.get(card.id) ?? [],
    }))
  }, [view?.cards, isHistory, reconstructed])

  const layout = useMemo(() => {
    if (displayCards.length === 0) return null

    const rows = displayCards.map((c) => c.position.row)
    const cols = displayCards.map((c) => c.position.col)
    const occupied = new Map<string, CardView>()
    for (const c of displayCards) occupied.set(keyOf(c.position.row, c.position.col), c)

    return {
      minRow: Math.min(...rows) - 1,
      maxRow: Math.max(...rows) + 1,
      minCol: Math.min(...cols) - 1,
      maxCol: Math.max(...cols) + 1,
      occupied,
    }
  }, [displayCards])

  if (!view || !layout) {
    return <div className="text-sm text-paper/50">Plateau vide</div>
  }

  const canDrag = !isHistory && view.is_my_turn && view.current_turn_phase === 'move'
  const canPlaceClue = !isHistory && view.is_my_turn && view.current_turn_phase === 'clue'

  const { minRow, maxRow, minCol, maxCol, occupied } = layout
  const numRows = maxRow - minRow + 1
  const numCols = maxCol - minCol + 1

  const cells: ReactNode[] = []
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const gridColumn = col - minCol + 1
      const gridRow = row - minRow + 1
      const card = occupied.get(keyOf(row, col))

      if (card) {
        cells.push(
          <YokaiCard
            key={card.id}
            card={card}
            style={{ gridColumn, gridRow }}
            draggable={canDrag && !card.is_locked}
            clueDropTarget={canPlaceClue && !card.is_locked}
            onActivate={() => !isHistory && onCardActivate(card.id)}
            highlighted={isHistory && card.id === highlightedCardId}
          />,
        )
      } else {
        const isAdjacent =
          occupied.has(keyOf(row - 1, col)) ||
          occupied.has(keyOf(row + 1, col)) ||
          occupied.has(keyOf(row, col - 1)) ||
          occupied.has(keyOf(row, col + 1))
        cells.push(
          <DropZone
            key={keyOf(row, col)}
            row={row}
            col={col}
            style={{ gridColumn, gridRow }}
            active={isAdjacent && canDrag}
          />,
        )
      }
    }
  }

  return (
    <div
      className="grid gap-2 rounded-lg border border-gold/10 bg-black/10 p-3"
      style={{
        gridTemplateColumns: `repeat(${numCols}, minmax(3.25rem, 4.5rem))`,
        gridTemplateRows: `repeat(${numRows}, minmax(3.25rem, 4.5rem))`,
      }}
    >
      {cells}
    </div>
  )
}
