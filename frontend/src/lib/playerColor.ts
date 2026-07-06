/**
 * Palette purement décorative pour distinguer visuellement les joueurs dans l'UI
 * (ex: badges "observé par"). Sans rapport avec les couleurs des cartes Yōkai.
 */
const PLAYER_PALETTE = [
  '#E69F00',
  '#56B4E9',
  '#009E73',
  '#F0E442',
  '#0072B2',
  '#D55E00',
  '#CC79A7',
  '#999999',
] as const

export function getPlayerColor(pseudo: string): string {
  let hash = 0
  for (let i = 0; i < pseudo.length; i++) {
    hash = (hash * 31 + pseudo.charCodeAt(i)) | 0
  }
  return PLAYER_PALETTE[Math.abs(hash) % PLAYER_PALETTE.length]
}

export function getPlayerMonogram(pseudo: string): string {
  return pseudo.slice(0, 2).toUpperCase()
}
