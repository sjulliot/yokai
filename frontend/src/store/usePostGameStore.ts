import { create } from 'zustand'
import type { HistoryEntry, PlayerView } from '../types/protocol'

interface PostGameState {
  /** true dès que `phase === 'finished'` a été atteint, jusqu'à ce que le joueur quitte l'écran. */
  frozen: boolean
  pendingView: PlayerView | null
  pendingEntries: HistoryEntry[] | null
  enterFrozen: () => void
  bufferState: (view: PlayerView) => void
  bufferHistory: (entries: HistoryEntry[]) => void
  /** Consomme le state/history en attente (s'il y en a) et sort du gel. */
  release: () => { view: PlayerView | null; entries: HistoryEntry[] | null }
}

/**
 * Une fois la partie terminée, le joueur reste sur l'écran de fin (plateau,
 * indices, historique) tant qu'il n'a pas explicitement cliqué "Retour à la
 * salle d'attente" — même si un autre joueur déclenche ce retour entre-temps
 * (voir `back_to_waiting_room` côté backend, qui vide l'historique pour tout
 * le monde). Les messages `state`/`history` reçus pendant ce gel sont
 * bufferisés ici plutôt qu'appliqués à `useGameStore`/`useHistoryStore`.
 */
export const usePostGameStore = create<PostGameState>((set, get) => ({
  frozen: false,
  pendingView: null,
  pendingEntries: null,
  enterFrozen: () => set({ frozen: true }),
  bufferState: (view) => set({ pendingView: view }),
  bufferHistory: (entries) => set({ pendingEntries: entries }),
  release: () => {
    const { pendingView, pendingEntries } = get()
    set({ frozen: false, pendingView: null, pendingEntries: null })
    return { view: pendingView, entries: pendingEntries }
  },
}))
