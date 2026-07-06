import { create } from 'zustand'
import type { HistoryEntry } from '../types/protocol'

interface HistoryStoreState {
  entries: HistoryEntry[]
  setEntries: (entries: HistoryEntry[]) => void
}

/**
 * Réponse à `query_history` (lecture seule, ne mute jamais l'état de jeu
 * live). Alimenté par WebSocketProvider sur réception d'un message `history`.
 */
export const useHistoryStore = create<HistoryStoreState>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
}))
