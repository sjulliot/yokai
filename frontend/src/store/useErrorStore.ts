import { create } from 'zustand'

interface ErrorStoreState {
  lastError: { code: string; message: string } | null
  setError: (error: { code: string; message: string }) => void
  clear: () => void
}

const AUTO_DISMISS_MS = 5000

let dismissTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Dernière erreur reçue du serveur (message `error`), à afficher dans un
 * toast/bandeau par n'importe quel composant. Un nouvel appel écrase le
 * précédent (une seule erreur affichée à la fois suffit pour ce projet).
 * Se ferme automatiquement après `AUTO_DISMISS_MS`.
 */
export const useErrorStore = create<ErrorStoreState>((set) => ({
  lastError: null,
  setError: (error) => {
    if (dismissTimeout) clearTimeout(dismissTimeout)
    set({ lastError: error })
    dismissTimeout = setTimeout(() => set({ lastError: null }), AUTO_DISMISS_MS)
  },
  clear: () => {
    if (dismissTimeout) clearTimeout(dismissTimeout)
    dismissTimeout = null
    set({ lastError: null })
  },
}))
