/**
 * Calcul des compteurs d'indices par défaut (1/2/3 couleurs) en fonction du
 * nombre de couleurs en jeu, du nombre de cartes par couleur et du nombre
 * de joueurs. Réplique la table officielle du jeu (colors=4, cards_per_color=4) :
 *
 *   2 joueurs -> {1:2, 2:3, 3:2}   (total 7)
 *   3 joueurs -> {1:2, 2:4, 3:3}   (total 9)
 *   4 joueurs -> {1:3, 2:4, 3:3}   (total 10)
 *
 * Hors 2-4 joueurs : clamp entre 2 et 4. Hors 16 cartes (4x4) : mise à
 * l'échelle proportionnelle (minimum 1 par taille si la table officielle en
 * avait au moins 1). Les tailles de combinaison > numColors sont ignorées
 * (mises à 0).
 */
export interface ClueCounts {
  1: number
  2: number
  3: number
}

const OFFICIAL_BY_PLAYERS: Record<number, ClueCounts> = {
  2: { 1: 2, 2: 3, 3: 2 },
  3: { 1: 2, 2: 4, 3: 3 },
  4: { 1: 3, 2: 4, 3: 3 },
}

const REFERENCE_TOTAL_CARDS = 16 // 4 couleurs x 4 cartes

function scaleCount(baseValue: number, ratio: number): number {
  if (baseValue <= 0) return 0
  return Math.max(1, Math.round(baseValue * ratio))
}

export function defaultClueCounts(
  numColors: number,
  cardsPerColor: number,
  numPlayers: number,
): ClueCounts {
  const clampedPlayers = Math.min(4, Math.max(2, Math.round(numPlayers) || 2))
  const base = OFFICIAL_BY_PLAYERS[clampedPlayers]

  const totalCards = numColors * cardsPerColor
  const ratio = totalCards > 0 ? totalCards / REFERENCE_TOTAL_CARDS : 1

  const scaled: ClueCounts = {
    1: scaleCount(base[1], ratio),
    2: scaleCount(base[2], ratio),
    3: scaleCount(base[3], ratio),
  }

  if (numColors < 3) scaled[3] = 0
  if (numColors < 2) scaled[2] = 0

  return scaled
}
