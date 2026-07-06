import { useDroppable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'

interface DropZoneProps {
  row: number
  col: number
  active: boolean
  style?: CSSProperties
}

/**
 * Case libre du plateau. `active` indique qu'elle est adjacente à au moins
 * une carte existante et que la phase courante autorise un déplacement —
 * seules ces cases sont réellement `droppable` (la validation finale reste
 * de toute façon côté serveur, ceci n'est qu'un guide visuel).
 */
export function DropZone({ row, col, active, style }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
    disabled: !active,
  })

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-md border border-dashed transition-colors',
        active ? (isOver ? 'border-gold bg-gold/20' : 'border-gold/30 bg-gold/5') : 'border-transparent',
      ].join(' ')}
    />
  )
}
