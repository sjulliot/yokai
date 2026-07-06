import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useSyncedValue } from '../../hooks/useSyncedValue'
import { YOKAI_FAMILIES, getYokaiHex } from '../../lib/colors'
import { defaultClueCounts } from '../../lib/clueCounts'
import { ClueCountsEditor } from './ClueCountsEditor'
import { AffinityOptionControl } from './AffinityOptionControl'
import { ObjectiveOptionControl } from './ObjectiveOptionControl'
import { RuleTogglesControl } from './RuleTogglesControl'

const MIN_COLORS = 2
const MIN_CARDS_PER_COLOR = 2
const DEFAULT_TURN_TIMER = 60
const DEFAULT_GAME_TIMER = 600

/**
 * Formulaire d'édition de `GameConfig`. Chaque contrôle envoie un
 * `set_config` avec uniquement le(s) champ(s) modifié(s) — sauf `colors` et
 * `cards_per_color` qui recalculent systématiquement `clue_counts` par
 * défaut (une combinaison à 3 couleurs devient invalide si moins de 3
 * couleurs sont en jeu). Les éditions manuelles de `clue_counts` via
 * `ClueCountsEditor` restent ensuite prioritaires tant que `colors` ou
 * `cards_per_color` ne changent pas à nouveau.
 */
export function GameSettingsForm() {
  const config = useGameStore((s) => s.view?.config)
  const numPlayers = useGameStore((s) => s.view?.connected_players.length ?? 0)
  const { send } = useWebSocket()

  const [cardsPerColor, setCardsPerColor] = useSyncedValue(
    config?.cards_per_color ?? MIN_CARDS_PER_COLOR,
    (value) => {
      const numColors = config?.colors.length ?? 0
      send({
        type: 'set_config',
        payload: {
          cards_per_color: value,
          clue_counts: defaultClueCounts(numColors, value, numPlayers),
        },
      })
    },
  )

  const [turnTimerValue, setTurnTimerValue] = useSyncedValue(
    config?.turn_timer_seconds ?? DEFAULT_TURN_TIMER,
    (value) => {
      send({ type: 'set_config', payload: { turn_timer_seconds: value } })
    },
  )

  const [gameTimerValue, setGameTimerValue] = useSyncedValue(
    config?.game_timer_seconds ?? DEFAULT_GAME_TIMER,
    (value) => {
      send({ type: 'set_config', payload: { game_timer_seconds: value } })
    },
  )

  if (!config) return null

  function toggleColor(colorId: string) {
    if (!config) return
    const isSelected = config.colors.includes(colorId)
    if (isSelected && config.colors.length <= MIN_COLORS) return

    const nextColors = isSelected
      ? config.colors.filter((c) => c !== colorId)
      : [...config.colors, colorId]

    send({
      type: 'set_config',
      payload: {
        colors: nextColors,
        clue_counts: defaultClueCounts(nextColors.length, config.cards_per_color, numPlayers),
      },
    })
  }

  const turnTimerEnabled = config.turn_timer_seconds !== null
  const gameTimerEnabled = config.game_timer_seconds !== null

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-display text-lg text-gold">Règles de base</h2>

        <div>
          <p className="mb-1 text-sm text-paper/80">
            Couleurs en jeu (minimum {MIN_COLORS})
          </p>
          <div className="flex flex-wrap gap-2">
            {YOKAI_FAMILIES.map((family) => {
              const selected = config.colors.includes(family.id)
              return (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => toggleColor(family.id)}
                  aria-pressed={selected}
                  title={family.id}
                  className={`h-9 w-9 rounded-full border-2 transition-transform ${
                    selected ? 'scale-110 border-gold' : 'border-transparent opacity-40'
                  }`}
                  style={{ backgroundColor: getYokaiHex(family.id) }}
                />
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-paper/80">Cartes par couleur</span>
          <input
            type="number"
            min={MIN_CARDS_PER_COLOR}
            value={cardsPerColor}
            onChange={(event) => setCardsPerColor(Number(event.target.value))}
            className="w-20 rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.perfect_memory}
            onChange={(event) =>
              send({ type: 'set_config', payload: { perfect_memory: event.target.checked } })
            }
          />
          Mémoire parfaite
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.history_enabled}
            onChange={(event) =>
              send({ type: 'set_config', payload: { history_enabled: event.target.checked } })
            }
          />
          Historique activé
        </label>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={turnTimerEnabled}
              onChange={(event) =>
                send({
                  type: 'set_config',
                  payload: { turn_timer_seconds: event.target.checked ? turnTimerValue : null },
                })
              }
            />
            Timer par tour
          </label>
          {turnTimerEnabled && (
            <input
              type="number"
              min={1}
              value={turnTimerValue}
              onChange={(event) => setTurnTimerValue(Number(event.target.value))}
              className="w-20 rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
            />
          )}
          {turnTimerEnabled && <span className="text-sm text-paper/60">secondes</span>}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={gameTimerEnabled}
              onChange={(event) =>
                send({
                  type: 'set_config',
                  payload: { game_timer_seconds: event.target.checked ? gameTimerValue : null },
                })
              }
            />
            Timer de partie
          </label>
          {gameTimerEnabled && (
            <input
              type="number"
              min={1}
              value={gameTimerValue}
              onChange={(event) => setGameTimerValue(Number(event.target.value))}
              className="w-20 rounded border border-gold/40 bg-ink px-2 py-1 text-paper focus:border-gold focus:outline-none"
            />
          )}
          {gameTimerEnabled && <span className="text-sm text-paper/60">secondes</span>}
        </div>
      </section>

      <ClueCountsEditor />

      <section className="space-y-2">
        <h2 className="font-display text-lg text-gold">Options avancées</h2>
        <AffinityOptionControl />
        <ObjectiveOptionControl />
        <RuleTogglesControl />
      </section>
    </div>
  )
}
