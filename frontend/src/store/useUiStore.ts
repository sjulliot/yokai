import { create } from 'zustand'

export type ViewMode = 'live' | 'history'

interface UiStoreState {
  viewMode: ViewMode
  historyIndex: number | null
  selectedCardId: number | null
  openPopoverCardId: number | null
  setViewMode: (mode: ViewMode) => void
  setHistoryIndex: (index: number | null) => void
  setSelectedCardId: (cardId: number | null) => void
  setOpenPopoverCardId: (cardId: number | null) => void
}

/**
 * État UI pur (indépendant de l'état serveur). Squelette minimal,
 * sera étoffé par les agents qui construiront le plateau / l'historique.
 */
export const useUiStore = create<UiStoreState>((set) => ({
  viewMode: 'live',
  historyIndex: null,
  selectedCardId: null,
  openPopoverCardId: null,
  setViewMode: (mode) => set({ viewMode: mode }),
  setHistoryIndex: (index) => set({ historyIndex: index }),
  setSelectedCardId: (cardId) => set({ selectedCardId: cardId }),
  setOpenPopoverCardId: (cardId) => set({ openPopoverCardId: cardId }),
}))
