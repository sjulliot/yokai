import { create } from 'zustand'
import type { PlayerView } from '../types/protocol'

export type GameStatus = 'idle' | 'waiting' | 'playing' | 'finished'

interface GameStoreState {
  status: GameStatus
  view: PlayerView | null
  applyState: (view: PlayerView) => void
  reset: () => void
}

function statusFromPhase(phase: PlayerView['phase']): GameStatus {
  switch (phase) {
    case 'waiting_room':
      return 'waiting'
    case 'in_progress':
      return 'playing'
    case 'finished':
      return 'finished'
  }
}

/**
 * Miroir strict de l'état serveur. Aucune logique de règle du jeu ici :
 * ce store se contente de stocker le dernier `PlayerView` reçu et d'en
 * dériver un `status` d'écran pour piloter le `switch` de `App.tsx`.
 */
export const useGameStore = create<GameStoreState>((set) => ({
  status: 'idle',
  view: null,
  applyState: (view) => set({ view, status: statusFromPhase(view.phase) }),
  reset: () => set({ view: null, status: 'idle' }),
}))
