import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useSyncedValue } from '../../hooks/useSyncedValue'

/**
 * `num_affinity_cards` fait à la fois office de flag (0 = désactivé) et de
 * valeur : la checkbox reflète `> 0`, avec une valeur par défaut de 1 à
 * l'activation.
 */
export function AffinityOptionControl() {
  const config = useGameStore((s) => s.view?.config)
  const { send } = useWebSocket()

  const [count, setCount] = useSyncedValue(config?.num_affinity_cards ?? 0, (value) => {
    send({ type: 'set_config', payload: { num_affinity_cards: value } })
  })

  if (!config) return null

  const enabled = config.num_affinity_cards > 0

  function handleToggle(next: boolean) {
    send({ type: 'set_config', payload: { num_affinity_cards: next ? 1 : 0 } })
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => handleToggle(event.target.checked)}
        />
        Activer les cartes Affinité
      </label>
      {enabled && (
        <label className="flex items-center gap-2 pl-6 text-sm text-paper/80">
          Nombre de cartes Affinité
          <input
            type="number"
            min={0}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="w-16 rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
          />
        </label>
      )}
    </div>
  )
}
