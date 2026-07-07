/**
 * Contrat réseau partagé avec le backend FastAPI.
 * Ne PAS modifier sans synchronisation avec le backend — voir
 * /Users/sjulliot/.claude/plans/etablis-un-plan-pour-fizzy-cloud.md
 */

export interface Position {
  row: number
  col: number
}

export interface GameConfig {
  colors: string[]
  cards_per_color: number
  perfect_memory: boolean
  turn_timer_seconds: number | null
  game_timer_seconds: number | null
  history_enabled: boolean
  clue_counts: { 1: number; 2: number; 3: number }
  stack_clues: boolean
  blind_clues: boolean
  num_affinity_cards: number
  objective_shape: string | null
}

export interface CardView {
  id: number
  position: Position
  is_locked: boolean
  known_color: string | null
  possible_colors: string[]
  observed_by: string[]
}

export interface ClueView {
  id: string
  colors: string[] | null // null si indice aveugle et non-omniscient
  order_revealed: number | null
  played_on_card_id: number | null
}

export interface AffinityCardView {
  color_a: string
  color_b: string
  holder_pseudo: string
}

export interface HistoryEntry {
  seq: number
  turn_number: number
  actor: string
  action:
    | 'start_game'
    | 'observe'
    | 'move'
    | 'reveal_clue'
    | 'place_clue'
    | 'declare_end'
    | 'turn_timeout'
    | 'game_timeout'
    | 'game_end'
  details: Record<string, unknown>
}

export interface ScoreEstimate {
  low: number
  high: number
  low_tier: 'honorable' | 'glorieuse' | 'legendaire'
  high_tier: 'honorable' | 'glorieuse' | 'legendaire'
}

export interface GameResult {
  victory: boolean
  reasons: string[]
  revealed_board: Record<number, string>
  score: number | null
  score_tier: 'honorable' | 'glorieuse' | 'legendaire' | null
}

export type GamePhase = 'waiting_room' | 'in_progress' | 'finished'
export type TurnPhase = 'observe' | 'move' | 'clue'
export type PlayerRole = 'player' | 'spectator'

export interface PlayerView {
  my_pseudo: string
  my_role: PlayerRole
  viewing_as: string | null // pertinent seulement pour un spectateur : pseudo dont il voit le point de vue, ou null = omniscient
  phase: GamePhase
  config: GameConfig
  cards: CardView[]
  clue_pile_remaining: number
  revealed_clues: ClueView[]
  played_clues: Record<number, string>
  players_order: string[]
  connected_players: string[]
  current_player: string | null
  current_turn_phase: TurnPhase | null
  observations_this_turn: number
  is_my_turn: boolean
  turn_deadline: number | null // epoch seconds
  game_deadline: number | null
  my_notes: Record<number, { text: string; forced_color: string | null }>
  my_affinity_cards: AffinityCardView[]
  objective_shape: string | null
  result: GameResult | null
  history_enabled: boolean
  score_estimate: ScoreEstimate | null
  score_tiers: [number, string][]
}

export type ClientAction =
  | { type: 'join'; payload: { pseudo: string; player_id?: string | null } }
  | { type: 'set_config'; payload: Partial<GameConfig> }
  | { type: 'start_game'; payload: Record<string, never> }
  | { type: 'back_to_waiting_room'; payload: Record<string, never> }
  | { type: 'kick_player'; payload: { pseudo: string } }
  | {
      type: 'game_action'
      payload:
        | { action: 'observe'; card_id: number }
        | { action: 'skip_observe' }
        | { action: 'move'; card_id: number; to: Position }
        | { action: 'skip_move' }
        | { action: 'undo_move' }
        | { action: 'reveal_clue' }
        | { action: 'place_clue'; clue_id: string; card_id: number }
        | { action: 'skip_clue' }
        | { action: 'declare_end' }
    }
  | { type: 'set_note'; payload: { card_id: number; text: string } }
  | { type: 'set_deduction'; payload: { card_id: number; forced_color: string | null } }
  | { type: 'query_history'; payload: Record<string, never> }
  | { type: 'set_spectator_view'; payload: { target: string | null } }

export type ServerEvent =
  | { type: 'joined'; payload: { pseudo: string; player_id: string; role: PlayerRole } }
  | { type: 'state'; payload: PlayerView }
  | { type: 'observation_result'; payload: { card_id: number; color: string } }
  | { type: 'history'; payload: { entries: HistoryEntry[] } }
  | { type: 'error'; payload: { code: string; message: string } }
