import { useGameStore } from '../../store/useGameStore'

const TIER_LABELS: Record<string, string> = {
  honorable: 'Honorable',
  glorieuse: 'Glorieuse',
  legendaire: 'Légendaire',
}

function tierLabel(id: string): string {
  return TIER_LABELS[id] ?? id
}

/**
 * Fourchette de score en cours de partie : le serveur ne peut donner qu'un
 * intervalle (`score_estimate.low/high`) car le score exact des indices déjà
 * posés dépend des vraies couleurs des cartes, tenues secrètes jusqu'à la
 * fin — voir `scoring.py::estimate_live_score`. Affiche aussi les paliers
 * officiels pour le nombre de joueurs actuel.
 */
export function ScorePanel() {
  const estimate = useGameStore((s) => s.view?.score_estimate ?? null)
  const tiers = useGameStore((s) => s.view?.score_tiers ?? [])
  if (!estimate) return null

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gold">Score en cours</h2>
      <div className="rounded border border-gold/20 bg-black/20 px-3 py-2 text-xs text-paper/80">
        <p>
          {estimate.low === estimate.high ? (
            <span className="font-medium text-paper">{estimate.low} points</span>
          ) : (
            <span className="font-medium text-paper">
              {estimate.low} à {estimate.high} points
            </span>
          )}
          {' — '}
          {estimate.low_tier === estimate.high_tier
            ? tierLabel(estimate.low_tier)
            : `${tierLabel(estimate.low_tier)} à ${tierLabel(estimate.high_tier)}`}
        </p>
        <p className="mt-1 text-paper/50">
          Paliers : {tiers.map(([threshold, tier]) => `${tierLabel(tier)} ≤ ${threshold}`).join(' · ')}
          {tiers.length > 0 && ` · Légendaire > ${tiers[tiers.length - 1][0]}`}
        </p>
      </div>
    </div>
  )
}
