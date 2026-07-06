import { useState, type FormEvent } from 'react'
import { useIdentityStore } from '../store/useIdentityStore'
import { useErrorStore } from '../store/useErrorStore'
import { useWebSocket } from '../hooks/useWebSocket'

const MAX_PSEUDO_LENGTH = 20

/**
 * Écran d'entrée : saisie du pseudo puis envoi de l'action `join`. Le
 * bouton est désactivé tant que la socket n'est pas ouverte, et le statut
 * de connexion ainsi que la dernière erreur serveur sont affichés.
 */
export function EntryScreen() {
  const [pseudo, setPseudo] = useState(() => useIdentityStore.getState().pseudo)
  const setStoredPseudo = useIdentityStore((state) => state.setPseudo)
  const playerId = useIdentityStore((state) => state.playerId)
  const { send, status } = useWebSocket()
  const lastError = useErrorStore((s) => s.lastError)
  const clearError = useErrorStore((s) => s.clear)

  const trimmed = pseudo.trim()
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_PSEUDO_LENGTH
  const canSubmit = isValid && status === 'open'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || status !== 'open') return

    setStoredPseudo(trimmed)
    send({ type: 'join', payload: { pseudo: trimmed, player_id: playerId } })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-4 text-paper">
      <h1 className="font-display text-4xl text-gold">Yōkai</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          value={pseudo}
          onChange={(event) => setPseudo(event.target.value)}
          placeholder="Ton pseudo"
          maxLength={MAX_PSEUDO_LENGTH}
          className="rounded border border-gold/40 bg-ink px-3 py-2 text-paper placeholder:text-paper/40 focus:border-gold focus:outline-none"
          autoFocus
        />

        {status !== 'open' && (
          <p className="text-sm text-paper/60">
            {status === 'connecting' && 'Connexion en cours…'}
            {status === 'reconnecting' && 'Reconnexion en cours…'}
            {status === 'closed' && 'Connexion au serveur indisponible.'}
          </p>
        )}

        {lastError && (
          <div className="flex items-center justify-between gap-4 rounded border border-lacquer/60 bg-lacquer/10 px-3 py-2 text-sm">
            <span>{lastError.message}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-paper/60 hover:text-paper"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-lacquer px-3 py-2 font-medium text-paper transition-colors hover:bg-lacquer/80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lacquer"
        >
          Rejoindre
        </button>
      </form>
    </main>
  )
}
