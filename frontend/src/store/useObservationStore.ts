import { create } from 'zustand'

interface Reveal {
  card_id: number
  color: string
}

interface ObservationStoreState {
  reveals: Reveal[]
  addReveal: (reveal: Reveal) => void
  clear: () => void
}

/**
 * Révélations reçues via `observation_result` pendant le tour en cours : la
 * vraie couleur des cartes que le joueur vient d'observer (jusqu'à 2 par
 * tour). Affichées sur le plateau jusqu'à la fin du tour (déplacement +
 * indice compris), puis effacées — le joueur doit ensuite s'en souvenir
 * lui-même (perfect memory OFF).
 */
export const useObservationStore = create<ObservationStoreState>((set) => ({
  reveals: [],
  addReveal: (reveal) =>
    set((s) => ({ reveals: [...s.reveals.filter((r) => r.card_id !== reveal.card_id), reveal] })),
  clear: () => set({ reveals: [] }),
}))
