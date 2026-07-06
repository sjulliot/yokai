import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface IdentityStoreState {
  pseudo: string
  playerId: string | null
  setPseudo: (pseudo: string) => void
  setPlayerId: (id: string | null) => void
}

/**
 * Identité du joueur, persistée en localStorage pour survivre aux
 * rechargements / reconnexions (le `player_id` renvoyé par le serveur
 * permet de retrouver la même session de jeu).
 */
export const useIdentityStore = create<IdentityStoreState>()(
  persist(
    (set) => ({
      pseudo: '',
      playerId: null,
      setPseudo: (pseudo) => set({ pseudo }),
      setPlayerId: (id) => set({ playerId: id }),
    }),
    { name: 'yokai-identity' },
  ),
)
