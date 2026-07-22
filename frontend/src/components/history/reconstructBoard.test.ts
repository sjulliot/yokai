import { describe, expect, it } from 'vitest'
import { reconstructBoardAtSeq } from './reconstructBoard'
import type { HistoryEntry } from '../../types/protocol'

const entries: HistoryEntry[] = [
  {
    seq: 0,
    turn_number: 0,
    actor: 'system',
    action: 'start_game',
    details: {
      positions: {
        '1': { row: 0, col: 0 },
        '2': { row: 0, col: 1 },
        '3': { row: 1, col: 0 },
      },
    },
  },
  {
    seq: 1,
    turn_number: 1,
    actor: 'alice',
    action: 'move',
    details: { card_id: 1, to: { row: 2, col: 2 } },
  },
  {
    seq: 2,
    turn_number: 1,
    actor: 'alice',
    action: 'move',
    details: { card_id: 2, to: { row: 3, col: 3 } },
  },
  {
    seq: 3,
    turn_number: 2,
    actor: 'bob',
    action: 'reveal_clue',
    details: { clue_id: 'c1' },
  },
  {
    seq: 4,
    turn_number: 2,
    actor: 'bob',
    action: 'place_clue',
    details: { card_id: 1, clue_id: 'c1' },
  },
  {
    seq: 5,
    turn_number: 2,
    actor: 'bob',
    action: 'observe',
    details: { card_id: 3 },
  },
]

describe('reconstructBoardAtSeq', () => {
  it('returns null when no start_game entry exists', () => {
    expect(reconstructBoardAtSeq([], 0)).toBeNull()
  })

  it('returns only initial positions at seq 0, nothing locked', () => {
    const result = reconstructBoardAtSeq(entries, 0)
    expect(result).not.toBeNull()
    expect(result!.positions.get(1)).toEqual({ row: 0, col: 0 })
    expect(result!.positions.get(2)).toEqual({ row: 0, col: 1 })
    expect(result!.positions.get(3)).toEqual({ row: 1, col: 0 })
    expect(result!.lockedCardIds.size).toBe(0)
  })

  it('applies the first move only at seq 1', () => {
    const result = reconstructBoardAtSeq(entries, 1)
    expect(result!.positions.get(1)).toEqual({ row: 2, col: 2 })
    expect(result!.positions.get(2)).toEqual({ row: 0, col: 1 })
    expect(result!.lockedCardIds.size).toBe(0)
  })

  it('applies both moves at seq 2', () => {
    const result = reconstructBoardAtSeq(entries, 2)
    expect(result!.positions.get(1)).toEqual({ row: 2, col: 2 })
    expect(result!.positions.get(2)).toEqual({ row: 3, col: 3 })
    expect(result!.lockedCardIds.size).toBe(0)
  })

  it('marks the clue as revealed but not placed at seq 3', () => {
    const result = reconstructBoardAtSeq(entries, 3)
    expect(result!.revealedClueIds.has('c1')).toBe(true)
    expect(result!.placedClueCardIds.has('c1')).toBe(false)
    expect(result!.lockedCardIds.size).toBe(0)
  })

  it('locks the card once place_clue is reached at seq 4', () => {
    const result = reconstructBoardAtSeq(entries, 4)
    expect(result!.positions.get(1)).toEqual({ row: 2, col: 2 })
    expect(result!.lockedCardIds.has(1)).toBe(true)
    expect(result!.lockedCardIds.has(2)).toBe(false)
    expect(result!.placedClueCardIds.get('c1')).toBe(1)
    expect(result!.observedBy.get(3) ?? []).toEqual([])
  })

  it('accumulates observers on a card without duplicates, in order', () => {
    const withRepeatedObserve: HistoryEntry[] = [
      ...entries,
      { seq: 6, turn_number: 2, actor: 'alice', action: 'observe', details: { card_id: 3 } },
      { seq: 7, turn_number: 2, actor: 'bob', action: 'observe', details: { card_id: 3 } },
    ]
    const result = reconstructBoardAtSeq(withRepeatedObserve, 7)
    expect(result!.observedBy.get(3)).toEqual(['bob', 'alice'])
  })

  it('is not affected by entries order in the input array', () => {
    const shuffled = [entries[3], entries[0], entries[2], entries[1]]
    const result = reconstructBoardAtSeq(shuffled, 2)
    expect(result!.positions.get(1)).toEqual({ row: 2, col: 2 })
    expect(result!.positions.get(2)).toEqual({ row: 3, col: 3 })
    expect(result!.lockedCardIds.size).toBe(0)
  })
})
