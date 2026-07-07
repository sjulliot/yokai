import type { HistoryEntry, Position } from '../../types/protocol'

export interface ReconstructedBoardState {
  positions: Map<number, Position>
  lockedCardIds: Set<number>
  observedBy: Map<number, string[]>
}

function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Position).row === 'number' &&
    typeof (value as Position).col === 'number'
  )
}

/**
 * Reconstruit l'état du plateau (positions + verrouillages) tel qu'il était
 * juste après l'entrée d'historique de `seq === uptoSeq` (bornes incluses).
 *
 * Principe : partir des positions INITIALES fournies par le backend dans
 * `start_game.details.positions` (voir plan), puis rejouer "en avant" les
 * entrées `move`/`place_clue` par `seq` croissant jusqu'à `uptoSeq`. Aucune
 * connaissance de la position de départ (`from`) de chaque déplacement n'est
 * nécessaire : la position d'arrivée (`to`) suffit à rejouer l'historique
 * dans l'ordre chronologique.
 */
export function reconstructBoardAtSeq(entries: HistoryEntry[], uptoSeq: number): ReconstructedBoardState | null {
  const startEntry = entries.find((e) => e.action === 'start_game')
  if (!startEntry) return null

  const rawPositions = startEntry.details.positions
  if (typeof rawPositions !== 'object' || rawPositions === null) {
    console.warn('reconstructBoardAtSeq: start_game.details.positions absent ou invalide', startEntry)
    return null
  }

  const positions = new Map<number, Position>()
  for (const [key, value] of Object.entries(rawPositions as Record<string, unknown>)) {
    const cardId = Number(key)
    if (Number.isNaN(cardId) || !isPosition(value)) {
      console.warn('reconstructBoardAtSeq: entrée de position invalide, ignorée', key, value)
      continue
    }
    positions.set(cardId, { row: value.row, col: value.col })
  }

  const lockedCardIds = new Set<number>()
  const observedBy = new Map<number, string[]>()

  const sorted = [...entries].sort((a, b) => a.seq - b.seq)
  for (const entry of sorted) {
    if (entry.seq > uptoSeq) break
    if (entry.action === 'move') {
      const { card_id, to } = entry.details
      if (typeof card_id !== 'number' || !isPosition(to)) {
        console.warn('reconstructBoardAtSeq: entrée move malformée, ignorée', entry)
        continue
      }
      positions.set(card_id, { row: to.row, col: to.col })
    } else if (entry.action === 'place_clue') {
      const { card_id } = entry.details
      if (typeof card_id !== 'number') {
        console.warn('reconstructBoardAtSeq: entrée place_clue malformée, ignorée', entry)
        continue
      }
      lockedCardIds.add(card_id)
    } else if (entry.action === 'observe') {
      const { card_id } = entry.details
      if (typeof card_id !== 'number') {
        console.warn('reconstructBoardAtSeq: entrée observe malformée, ignorée', entry)
        continue
      }
      const observers = observedBy.get(card_id) ?? []
      if (!observers.includes(entry.actor)) observers.push(entry.actor)
      observedBy.set(card_id, observers)
    }
  }

  return { positions, lockedCardIds, observedBy }
}
