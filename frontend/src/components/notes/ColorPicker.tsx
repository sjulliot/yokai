import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { getYokaiHex } from '../../lib/colors'
import type { CardView } from '../../types/protocol'

interface ColorPickerProps {
  card: CardView
}

// Référence stable : un fallback `?? []` inline créerait un nouveau tableau à chaque rendu
// (la carte n'a la plupart du temps pas encore de note), ce que Zustand/useSyncExternalStore
// interprète comme un changement permanent -> boucle de rendu infinie (React error #185).
const NO_EXCLUDED_COLORS: string[] = []

/**
 * Pastilles cliquables pour noter une déduction personnelle parmi les
 * `possible_colors` d'une carte :
 * - clic sur la pastille = "c'est sûrement cette couleur" (`forced_color`,
 *   une seule à la fois, un second clic l'enlève) ;
 * - clic sur le badge ✕ = "ce n'est pas cette couleur" (`excluded_colors`,
 *   plusieurs possibles en même temps).
 * Choisir une couleur affirmée efface les exclusions de cette carte (et
 * inversement, exclure la couleur affirmée l'efface) : les deux informations
 * sont mutuellement exclusives.
 */
export function ColorPicker({ card }: ColorPickerProps) {
  const { send } = useWebSocket()
  const forcedColor = useGameStore((s) => s.view?.my_notes[card.id]?.forced_color ?? null)
  const excludedColors = useGameStore(
    (s) => s.view?.my_notes[card.id]?.excluded_colors ?? NO_EXCLUDED_COLORS,
  )

  function toggleForced(color: string) {
    const next = forcedColor === color ? null : color
    send({ type: 'set_deduction', payload: { card_id: card.id, forced_color: next } })
  }

  function toggleExcluded(color: string) {
    const next = excludedColors.includes(color)
      ? excludedColors.filter((c) => c !== color)
      : [...excludedColors, color]
    send({ type: 'set_deduction_exclusion', payload: { card_id: card.id, excluded_colors: next } })
  }

  return (
    <div>
      <p className="mb-1 text-xs text-paper/60">Ma déduction</p>
      <div className="flex flex-wrap gap-3">
        {card.possible_colors.map((color) => {
          const isForced = forcedColor === color
          const isExcluded = excludedColors.includes(color)
          return (
            <div key={color} className="relative">
              <button
                type="button"
                onClick={() => toggleForced(color)}
                title={`C'est ${color}`}
                className="h-6 w-6 rounded-full border-2"
                style={{
                  backgroundColor: getYokaiHex(color),
                  opacity: isExcluded ? 0.35 : 1,
                  borderColor: isForced ? '#D4A657' : 'transparent',
                  boxShadow: isForced ? '0 0 0 2px rgba(212,166,87,0.6)' : undefined,
                }}
                aria-label={`${color} — c'est cette couleur`}
                aria-pressed={isForced}
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleExcluded(color)
                }}
                title={`Ce n'est pas ${color}`}
                className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none"
                style={{
                  borderColor: isExcluded ? '#C33C3C' : 'rgba(212,166,87,0.3)',
                  backgroundColor: isExcluded ? '#C33C3C' : 'rgba(0,0,0,0.4)',
                  color: isExcluded ? '#fff' : 'rgba(245,240,230,0.5)',
                }}
                aria-label={`${color} — ce n'est pas cette couleur`}
                aria-pressed={isExcluded}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-paper/40">couleur = c'est sûrement · ✕ = ce n'est pas</p>
    </div>
  )
}
