import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useSyncedValue } from '../../hooks/useSyncedValue'
import type { GameConfig } from '../../types/protocol'

type ClueSize = 1 | 2 | 3

function ClueCountField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [local, setLocal] = useSyncedValue(value, onChange)

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-paper/80">{label}</span>
      <input
        type="number"
        min={0}
        value={local}
        onChange={(event) => setLocal(Number(event.target.value))}
        className="rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
      />
    </label>
  )
}

/**
 * Édition des compteurs d'indices (1/2/3 couleurs). Les tailles impossibles
 * avec le nombre de couleurs en jeu sont masquées.
 */
export function ClueCountsEditor() {
  const config = useGameStore((s) => s.view?.config)
  const { send } = useWebSocket()

  if (!config) return null

  const numColors = config.colors.length

  function handleChange(size: ClueSize, value: number) {
    const clueCounts = { ...(config as GameConfig).clue_counts, [size]: value }
    send({ type: 'set_config', payload: { clue_counts: clueCounts } })
  }

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg text-gold">Indices</h2>
      <div className="grid grid-cols-3 gap-3">
        <ClueCountField
          label="1 couleur"
          value={config.clue_counts[1]}
          onChange={(v) => handleChange(1, v)}
        />
        {numColors >= 2 && (
          <ClueCountField
            label="2 couleurs"
            value={config.clue_counts[2]}
            onChange={(v) => handleChange(2, v)}
          />
        )}
        {numColors >= 3 && (
          <ClueCountField
            label="3 couleurs"
            value={config.clue_counts[3]}
            onChange={(v) => handleChange(3, v)}
          />
        )}
      </div>
    </section>
  )
}
