import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

/** Deux règles optionnelles indépendantes : empilement et indices aveugles. */
export function RuleTogglesControl() {
  const config = useGameStore((s) => s.view?.config)
  const { send } = useWebSocket()

  if (!config) return null

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.stack_clues}
          onChange={(event) =>
            send({ type: 'set_config', payload: { stack_clues: event.target.checked } })
          }
        />
        Empiler les indices révélés (seul le dernier est jouable)
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.blind_clues}
          onChange={(event) =>
            send({ type: 'set_config', payload: { blind_clues: event.target.checked } })
          }
        />
        Indices aveugles (révélés sans montrer leurs couleurs)
      </label>
    </div>
  )
}
