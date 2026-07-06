import { useErrorStore } from '../store/useErrorStore'
import { PlayerList } from '../components/waitingroom/PlayerList'
import { GameSettingsForm } from '../components/waitingroom/GameSettingsForm'
import { StartGameButton } from '../components/waitingroom/StartGameButton'

/** Salle d'attente : liste des joueurs, réglages de partie, lancement. */
export function WaitingRoom() {
  const lastError = useErrorStore((s) => s.lastError)
  const clearError = useErrorStore((s) => s.clear)

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-paper">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-center font-display text-3xl text-gold">Salle d'attente</h1>

        {lastError && (
          <div className="flex items-center justify-between gap-4 rounded border border-lacquer/60 bg-lacquer/10 px-4 py-2 text-sm text-paper">
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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">
          <PlayerList />
          <GameSettingsForm />
        </div>

        <div className="flex justify-center pt-4">
          <StartGameButton />
        </div>
      </div>
    </main>
  )
}
