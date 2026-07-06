import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore'
import type { PlayerView } from '../types/protocol'

const baseView: PlayerView = {
  my_pseudo: 'alice',
  my_role: 'player',
  viewing_as: null,
  phase: 'waiting_room',
  config: {
    colors: ['red', 'blue', 'green', 'yellow'],
    cards_per_color: 5,
    perfect_memory: false,
    turn_timer_seconds: null,
    game_timer_seconds: null,
    history_enabled: true,
    clue_counts: { 1: 3, 2: 2, 3: 1 },
    stack_clues: false,
    blind_clues: false,
    num_affinity_cards: 0,
    objective_shape: null,
  },
  cards: [],
  clue_pile_remaining: 6,
  revealed_clues: [],
  played_clues: {},
  players_order: ['alice'],
  connected_players: ['alice'],
  current_player: null,
  current_turn_phase: null,
  observations_this_turn: 0,
  is_my_turn: false,
  turn_deadline: null,
  game_deadline: null,
  my_notes: {},
  my_affinity_cards: [],
  objective_shape: null,
  result: null,
  history_enabled: true,
}

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('starts idle with no view', () => {
    expect(useGameStore.getState().status).toBe('idle')
    expect(useGameStore.getState().view).toBeNull()
  })

  it('derives status from the view phase on applyState', () => {
    useGameStore.getState().applyState(baseView)
    expect(useGameStore.getState().status).toBe('waiting')
    expect(useGameStore.getState().view).toEqual(baseView)

    useGameStore.getState().applyState({ ...baseView, phase: 'in_progress' })
    expect(useGameStore.getState().status).toBe('playing')

    useGameStore.getState().applyState({ ...baseView, phase: 'finished' })
    expect(useGameStore.getState().status).toBe('finished')
  })

  it('resets to idle', () => {
    useGameStore.getState().applyState(baseView)
    useGameStore.getState().reset()
    expect(useGameStore.getState().status).toBe('idle')
    expect(useGameStore.getState().view).toBeNull()
  })
})
