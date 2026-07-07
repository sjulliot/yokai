import { useEffect, useRef, useState } from 'react'
import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useGameStore } from '../store/useGameStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useErrorStore } from '../store/useErrorStore'
import { useObservationStore } from '../store/useObservationStore'
import type { GameResult } from '../types/protocol'
import { Board } from '../components/board/Board'
import { CluePile } from '../components/clues/CluePile'
import { ClueBoard } from '../components/clues/ClueBoard'
import { TurnBanner } from '../components/turn/TurnBanner'
import { PhaseStepper } from '../components/turn/PhaseStepper'
import { TimerBadge } from '../components/turn/TimerBadge'
import { PlayerList } from '../components/players/PlayerList'
import { AffinityCardPanel } from '../components/players/AffinityCardPanel'
import { ScorePanel } from '../components/players/ScorePanel'
import { SpectatorViewSwitcher } from '../components/spectator/SpectatorViewSwitcher'
import { HistorySlider } from '../components/history/HistorySlider'

const COLOR_LABELS: Record<string, string> = {
  red: 'rouge',
  blue: 'bleue',
  green: 'verte',
  yellow: 'jaune',
  orange: 'orange',
  purple: 'violette',
  sky: 'ciel',
  gray: 'grise',
}

const SCORE_TIER_LABELS: Record<string, string> = {
  honorable: 'Honorable',
  glorieuse: 'Glorieuse',
  legendaire: 'Légendaire',
}

function colorLabel(id: string): string {
  return COLOR_LABELS[id] ?? id
}

/**
 * Traduction best-effort des codes de raison d'échec (`GameResult.reasons`).
 * Le format exact de ces codes n'est pas fixé par `protocol.ts` (juste
 * `string[]`) : on couvre les motifs plausibles (regroupement par couleur,
 * Affinité, Objectif) et on affiche le code brut en repli sinon.
 */
function translateReason(reason: string): string {
  const disconnected = reason.match(/^color_(.+)_disconnected$/)
  if (disconnected) {
    return `La famille ${colorLabel(disconnected[1])} n'est pas regroupée`
  }
  const affinity = reason.match(/^affinity_(.+)_(.+)_not_met$/)
  if (affinity) {
    return `Les familles ${colorLabel(affinity[1])} et ${colorLabel(affinity[2])} ne sont pas adjacentes (carte Affinité)`
  }
  const objective = reason.match(/^objective_(.+)_not_met$/)
  if (objective) {
    return `La forme finale du plateau ne correspond pas à la carte Objectif (${objective[1]})`
  }
  return reason.replace(/_/g, ' ')
}

export function GameScreen() {
  const view = useGameStore((s) => s.view)
  const { send } = useWebSocket()
  const lastError = useErrorStore((s) => s.lastError)
  const clearError = useErrorStore((s) => s.clear)
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null)
  // Cartes déjà cliquées en phase Observer ce tour-ci : verrou synchrone (pas
  // le store, qui ne se remplit qu'après l'aller-retour serveur) empêchant un
  // double-clic sur la même carte de consommer les deux observations du tour.
  const observeClickedRef = useRef<Set<number>>(new Set())

  // Les révélations d'observation (`observation_result`) restent affichées
  // jusqu'à la fin du tour du joueur (déplacement + indice compris), puis
  // sont effacées au tour suivant.
  useEffect(() => {
    useObservationStore.getState().clear()
    observeClickedRef.current = new Set()
  }, [view?.current_player])

  // Un indice sélectionné pour être posé ne doit pas survivre à un
  // changement de phase/joueur (fin de tour, tour suivant...).
  useEffect(() => {
    if (view?.current_turn_phase !== 'clue') {
      setSelectedClueId(null)
    }
  }, [view?.current_turn_phase, view?.current_player])

  if (!view) return null

  function handleCardActivate(cardId: number) {
    if (!view) return
    const card = view.cards.find((c) => c.id === cardId)
    if (!card || card.is_locked) return

    if (view.is_my_turn && view.current_turn_phase === 'observe' && view.observations_this_turn < 2) {
      if (observeClickedRef.current.has(cardId)) return
      observeClickedRef.current.add(cardId)
      send({ type: 'game_action', payload: { action: 'observe', card_id: cardId } })
      return
    }

    if (view.is_my_turn && view.current_turn_phase === 'clue' && selectedClueId) {
      send({
        type: 'game_action',
        payload: { action: 'place_clue', clue_id: selectedClueId, card_id: cardId },
      })
      setSelectedClueId(null)
    }
  }

  // Point d'entrée unique du drag&drop (déplacement de carte en phase Move,
  // pose d'indice par glisser-déposer en phase Indice) : un seul DndContext
  // englobe le plateau et la pioche/`ClueBoard` pour permettre de glisser un
  // indice depuis l'aside jusque sur une carte du plateau.
  function handleDragEnd(event: DragEndEvent) {
    if (!view) return
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as { cardId?: number; clueId?: string } | undefined

    if (activeData?.clueId != null) {
      const cardId = (over.data.current as { cardId?: number } | undefined)?.cardId
      if (cardId == null) return
      send({
        type: 'game_action',
        payload: { action: 'place_clue', clue_id: activeData.clueId, card_id: cardId },
      })
      setSelectedClueId(null)
      return
    }

    if (activeData?.cardId != null) {
      const to = over.data.current as { row: number; col: number } | undefined
      if (!to) return
      send({
        type: 'game_action',
        payload: { action: 'move', card_id: activeData.cardId, to: { row: to.row, col: to.col } },
      })
    }
  }

  const canDeclareEnd = view.current_turn_phase === 'observe' && view.observations_this_turn === 0

  const canUndoMove = view.is_my_turn && view.current_turn_phase === 'clue'

  return (
    <main className="min-h-screen bg-ink px-4 py-6 text-paper">
      <header className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-gold">Yōkai</h1>
          <TurnBanner />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view.turn_deadline != null && <TimerBadge deadline={view.turn_deadline} label="Tour" />}
          {view.game_deadline != null && <TimerBadge deadline={view.game_deadline} label="Partie" />}
          <SpectatorViewSwitcher />
          {canUndoMove && (
            <button
              type="button"
              onClick={() => send({ type: 'game_action', payload: { action: 'undo_move' } })}
              className="rounded border border-gold/30 px-3 py-1.5 text-xs text-paper/70 hover:border-gold/60"
            >
              Annuler
            </button>
          )}
          {canDeclareEnd && (
            <button
              type="button"
              onClick={() => send({ type: 'game_action', payload: { action: 'declare_end' } })}
              className="rounded bg-lacquer px-3 py-1.5 text-xs font-medium text-paper hover:bg-lacquer/80"
            >
              Terminer la partie
            </button>
          )}
        </div>
      </header>

      {lastError && (
        <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between rounded border border-lacquer/50 bg-lacquer/10 px-3 py-2 text-sm text-lacquer">
          <span>{lastError.message}</span>
          <button type="button" onClick={clearError} className="text-xs underline">
            fermer
          </button>
        </div>
      )}

      {view.phase === 'finished' && view.result && (
        <ResultPanel
          result={view.result}
          onBackToWaitingRoom={() => send({ type: 'back_to_waiting_room', payload: {} })}
        />
      )}

      <div className="mx-auto mb-4 max-w-5xl">
        <PhaseStepper />
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col items-center gap-3">
            <Board onCardActivate={handleCardActivate} />
            <HistorySlider />
          </div>
          <aside className="space-y-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gold">Indices</h2>
              <div className="flex items-start gap-3">
                <CluePile />
                <ClueBoard selectedClueId={selectedClueId} onSelectClue={setSelectedClueId} />
              </div>
            </div>
            <ScorePanel />
            <AffinityCardPanel />
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gold">Joueurs</h2>
              <PlayerList />
            </div>
          </aside>
        </div>
      </DndContext>
    </main>
  )
}

function ResultPanel({
  result,
  onBackToWaitingRoom,
}: {
  result: GameResult
  onBackToWaitingRoom: () => void
}) {
  return (
    <div className="mx-auto mb-6 max-w-5xl rounded-lg border border-gold/30 bg-black/30 p-4">
      <h2 className={`font-display text-2xl ${result.victory ? 'text-gold' : 'text-lacquer'}`}>
        {result.victory ? 'Victoire ! Les Yōkai sont apaisés.' : 'Défaite — les Yōkai restent confus.'}
      </h2>
      {!result.victory && result.reasons.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm text-paper/80">
          {result.reasons.map((reason) => (
            <li key={reason}>{translateReason(reason)}</li>
          ))}
        </ul>
      )}
      {result.victory && result.score != null && (
        <p className="mt-2 text-sm text-paper/80">
          Score : {result.score}
          {result.score_tier && ` — ${SCORE_TIER_LABELS[result.score_tier] ?? result.score_tier}`}
        </p>
      )}
      <button
        type="button"
        onClick={onBackToWaitingRoom}
        className="mt-4 rounded bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/80"
      >
        Retour à la salle d'attente
      </button>
    </div>
  )
}
