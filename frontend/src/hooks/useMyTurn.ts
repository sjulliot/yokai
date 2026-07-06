import { useGameStore } from '../store/useGameStore'
import type { TurnPhase } from '../types/protocol'

export interface MyTurnInfo {
  isMyTurn: boolean
  phase: TurnPhase | null
}

/**
 * Sélecteur pur dérivant { isMyTurn, phase } depuis useGameStore.
 * Ne contient aucune logique de règle — simple lecture du dernier state.
 */
export function useMyTurn(): MyTurnInfo {
  return useGameStore((state) => ({
    isMyTurn: state.view?.is_my_turn ?? false,
    phase: state.view?.current_turn_phase ?? null,
  }))
}
