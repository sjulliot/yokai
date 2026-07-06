import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { getYokaiHex } from '../../lib/colors'
import type { CardView } from '../../types/protocol'

interface ColorPickerProps {
  card: CardView
}

/**
 * Pastilles cliquables pour forcer une déduction personnelle parmi les
 * `possible_colors` d'une carte. Un second clic sur la couleur déjà
 * sélectionnée l'enlève (`forced_color: null`).
 */
export function ColorPicker({ card }: ColorPickerProps) {
  const { send } = useWebSocket()
  const forcedColor = useGameStore((s) => s.view?.my_notes[card.id]?.forced_color ?? null)

  function toggle(color: string) {
    const next = forcedColor === color ? null : color
    send({ type: 'set_deduction', payload: { card_id: card.id, forced_color: next } })
  }

  return (
    <div>
      <p className="mb-1 text-xs text-paper/60">Ma déduction</p>
      <div className="flex flex-wrap gap-2">
        {card.possible_colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => toggle(color)}
            className="h-6 w-6 rounded-full border-2"
            style={{
              backgroundColor: getYokaiHex(color),
              borderColor: forcedColor === color ? '#D4A657' : 'transparent',
              boxShadow: forcedColor === color ? '0 0 0 2px rgba(212,166,87,0.6)' : undefined,
            }}
            aria-label={color}
            aria-pressed={forcedColor === color}
          />
        ))}
      </div>
    </div>
  )
}
