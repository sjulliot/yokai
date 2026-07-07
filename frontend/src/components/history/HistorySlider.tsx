import { useEffect, useMemo } from 'react'
import { useUiStore } from '../../store/useUiStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import type { HistoryEntry } from '../../types/protocol'

/**
 * Traduction en français d'une entrée d'historique publique.
 *
 * L'action `observe` ne révèle jamais la couleur vue (privée, transmise à
 * part à l'observateur) : seul le fait d'avoir regardé telle carte est public.
 */
function describeEntry(entry: HistoryEntry): string {
  const cardId = entry.details.card_id
  const cardLabel = typeof cardId === 'number' ? ` (carte #${cardId})` : ''

  switch (entry.action) {
    case 'start_game':
      return 'La partie commence'
    case 'observe':
      return `${entry.actor} a observé une carte${cardLabel}`
    case 'move':
      return `${entry.actor} a déplacé une carte${cardLabel}`
    case 'reveal_clue':
      return `${entry.actor} a révélé un indice`
    case 'place_clue':
      return `${entry.actor} a posé un indice sur une carte${cardLabel}`
    case 'declare_end':
      return `${entry.actor} a déclaré la fin de la partie`
    case 'turn_timeout':
      return `Le tour de ${entry.actor} a expiré`
    case 'game_timeout':
      return 'Le temps de partie est écoulé'
    case 'game_end':
      return `Partie terminée — ${entry.details.victory ? 'victoire' : 'défaite'}`
    default:
      return entry.action
  }
}

function isTextInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

/**
 * Bandeau permanent de navigation dans l'historique public de la partie,
 * sous forme de slider (pas de bouton ni de liste cliquable). Le flux WS
 * live continue de mettre à jour `useGameStore` en tâche de fond : ce
 * composant ne fait que piloter `useUiStore.viewMode`/`historyIndex`, lus
 * par `Board` pour reconstruire l'affichage à l'instant choisi.
 */
export function HistorySlider() {
  const viewMode = useUiStore((s) => s.viewMode)
  const historyIndex = useUiStore((s) => s.historyIndex)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const setHistoryIndex = useUiStore((s) => s.setHistoryIndex)
  const entries = useHistoryStore((s) => s.entries)

  const sorted = useMemo(() => [...entries].sort((a, b) => a.seq - b.seq), [entries])
  const maxTick = sorted.length // tick === maxTick veut dire "en direct"

  const currentTick =
    viewMode === 'history' && historyIndex !== null
      ? Math.max(
          0,
          sorted.findIndex((e) => e.seq === historyIndex),
        )
      : maxTick

  function goToTick(tick: number): void {
    if (sorted.length === 0) return
    const clamped = Math.max(0, Math.min(maxTick, tick))
    if (clamped >= maxTick) {
      setViewMode('live')
      setHistoryIndex(null)
    } else {
      setViewMode('history')
      setHistoryIndex(sorted[clamped].seq)
    }
  }

  // Navigation clavier ←/→, globale (pas besoin d'ouvrir quoi que ce soit
  // au préalable), ignorée quand on tape dans un champ texte (notes/déductions).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (isTextInputTarget(event.target)) return
      if (sorted.length === 0) return
      event.preventDefault()
      goToTick(currentTick + (event.key === 'ArrowRight' ? 1 : -1))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTick, sorted])

  if (sorted.length === 0) return null

  const currentEntry = currentTick < sorted.length ? sorted[currentTick] : null

  return (
    <div className="flex w-full flex-col gap-1 rounded-lg border border-gold/10 bg-black/10 px-3 py-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={maxTick}
          step={1}
          value={currentTick}
          onChange={(event) => goToTick(Number(event.target.value))}
          className="w-full accent-gold"
          aria-label="Navigation dans l'historique de la partie"
        />
        {viewMode === 'history' && (
          <button
            type="button"
            onClick={() => goToTick(maxTick)}
            className="shrink-0 rounded border border-gold/30 px-2 py-1 text-xs text-paper/70 hover:border-gold/60"
          >
            Direct
          </button>
        )}
      </div>
      <p className="text-xs text-paper/50">
        {viewMode === 'live'
          ? 'En direct'
          : `Étape ${currentTick + 1} / ${sorted.length}${currentEntry ? ` — ${describeEntry(currentEntry)}` : ''}`}
      </p>
    </div>
  )
}
