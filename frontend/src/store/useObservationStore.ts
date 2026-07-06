import { create } from 'zustand'

interface ObservationStoreState {
  reveal: { card_id: number; color: string } | null
  setReveal: (reveal: { card_id: number; color: string }) => void
  clear: () => void
}

/**
 * Révélation éphémère reçue via `observation_result` : la vraie couleur d'une
 * carte que le joueur vient d'observer, à afficher brièvement sur le plateau
 * puis effacer (le composant qui consomme ce store est responsable du délai
 * d'affichage, ce store ne fait que porter la dernière valeur reçue).
 */
export const useObservationStore = create<ObservationStoreState>((set) => ({
  reveal: null,
  setReveal: (reveal) => set({ reveal }),
  clear: () => set({ reveal: null }),
}))
