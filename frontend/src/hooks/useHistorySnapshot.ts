import { useMemo } from 'react'
import { useUiStore } from '../store/useUiStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { reconstructBoardAtSeq } from '../components/history/reconstructBoard'
import type { ReconstructedBoardState } from '../components/history/reconstructBoard'

interface HistorySnapshot {
  isHistory: boolean
  snapshot: ReconstructedBoardState | null
}

/**
 * Point d'accès partagé à l'état reconstruit de l'historique (plateau + indices), lu par tous
 * les composants qui doivent basculer entre l'état live et l'état à `historyIndex`
 * (Board, CluePile, ClueBoard).
 */
export function useHistorySnapshot(): HistorySnapshot {
  const viewMode = useUiStore((s) => s.viewMode)
  const historyIndex = useUiStore((s) => s.historyIndex)
  const entries = useHistoryStore((s) => s.entries)

  const isHistory = viewMode === 'history'

  const snapshot = useMemo(() => {
    if (!isHistory || historyIndex === null) return null
    return reconstructBoardAtSeq(entries, historyIndex)
  }, [isHistory, historyIndex, entries])

  return { isHistory, snapshot }
}
