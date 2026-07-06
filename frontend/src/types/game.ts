/**
 * Alias pratiques ré-exportés depuis le contrat réseau, pour usage courant
 * dans l'UI sans avoir à importer directement `protocol.ts` partout.
 */
export type {
  GamePhase as GameStatus,
  PlayerRole as Role,
  TurnPhase,
  PlayerView,
  GameConfig,
  CardView,
  ClueView,
  AffinityCardView,
  HistoryEntry,
  GameResult,
  Position,
  ClientAction,
  ServerEvent,
} from './protocol'
