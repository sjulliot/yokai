import { useGameStore } from '../../store/useGameStore'

const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle plein',
  square: 'Carré plein',
  line: 'Ligne',
}

function shapeLabel(shapeName: string): string {
  return SHAPE_LABELS[shapeName] ?? shapeName
}

/**
 * Carte Objectif : visible de tous les joueurs (contrairement à la carte
 * Affinité), elle indique la forme que doit prendre le plateau en fin de
 * partie. Le serveur l'envoie via `view.objective_shape` (`views.py::build_player_view`).
 */
export function ObjectiveCardPanel() {
  const objectiveShape = useGameStore((s) => s.view?.objective_shape)
  if (!objectiveShape) return null

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gold">Carte Objectif</h2>
      <p className="rounded border border-gold/20 bg-black/20 px-2 py-1.5 text-xs text-paper/80">
        Le plateau doit former : <span className="font-semibold text-paper">{shapeLabel(objectiveShape)}</span>
      </p>
    </div>
  )
}
