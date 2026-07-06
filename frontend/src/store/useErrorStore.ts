import { create } from 'zustand'

interface ErrorStoreState {
  lastError: { code: string; message: string } | null
  setError: (error: { code: string; message: string }) => void
  clear: () => void
}

/**
 * Dernière erreur reçue du serveur (message `error`), à afficher dans un
 * toast/bandeau par n'importe quel composant. Un nouvel appel écrase le
 * précédent (une seule erreur affichée à la fois suffit pour ce projet).
 */
export const useErrorStore = create<ErrorStoreState>((set) => ({
  lastError: null,
  setError: (error) => set({ lastError: error }),
  clear: () => set({ lastError: null }),
}))
