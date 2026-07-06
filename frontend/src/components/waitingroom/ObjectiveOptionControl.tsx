import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

const OBJECTIVE_LABELS: Record<string, string> = {
  random: 'Aléatoire',
  rectangle: 'Rectangle plein',
  square: 'Carré plein',
  line: 'Ligne',
}

/** Checkbox "Activer une carte Objectif" + choix de la forme. */
export function ObjectiveOptionControl() {
  const config = useGameStore((s) => s.view?.config)
  const { send } = useWebSocket()

  if (!config) return null

  const enabled = config.objective_shape !== null

  function handleToggle(next: boolean) {
    send({ type: 'set_config', payload: { objective_shape: next ? 'random' : null } })
  }

  function handleShapeChange(shape: string) {
    send({ type: 'set_config', payload: { objective_shape: shape } })
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => handleToggle(event.target.checked)}
        />
        Activer une carte Objectif
      </label>
      {enabled && (
        <select
          value={config.objective_shape ?? 'random'}
          onChange={(event) => handleShapeChange(event.target.value)}
          className="ml-6 rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
        >
          {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
