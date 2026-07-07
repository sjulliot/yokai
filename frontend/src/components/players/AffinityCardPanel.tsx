import { useGameStore } from '../../store/useGameStore'
import { getYokaiHex } from '../../lib/colors'

const COLOR_LABELS: Record<string, string> = {
  red: 'rouge',
  blue: 'bleue',
  green: 'verte',
  yellow: 'jaune',
  orange: 'orange',
  purple: 'violette',
  sky: 'ciel',
  gray: 'grise',
}

function colorLabel(id: string): string {
  return COLOR_LABELS[id] ?? id
}

/**
 * Carte(s) Affinité en ma possession : je suis seul à les voir (le serveur
 * ne les envoie qu'à leur détenteur, voir `views.py::build_player_view`).
 * Rappelle en permanence les deux familles à garder adjacentes en fin de
 * partie, sans quoi la victoire est refusée.
 */
export function AffinityCardPanel() {
  const affinityCards = useGameStore((s) => s.view?.my_affinity_cards ?? [])
  if (affinityCards.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gold">Carte Affinité</h2>
      <ul className="space-y-1">
        {affinityCards.map((card, index) => (
          <li
            key={`${card.color_a}-${card.color_b}-${index}`}
            className="flex items-center gap-2 rounded border border-gold/20 bg-black/20 px-2 py-1.5 text-xs text-paper/80"
          >
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: getYokaiHex(card.color_a) }}
              />
              {colorLabel(card.color_a)}
            </span>
            <span className="text-paper/50">doit être adjacente à</span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: getYokaiHex(card.color_b) }}
              />
              {colorLabel(card.color_b)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
