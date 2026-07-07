/**
 * Palette des familles de yōkai (inspirée de Paul Tol "bright/vibrant",
 * daltonisme-safe) — hues et luminosités écartées pour rester
 * distinguables même une fois teintées à faible opacité sur le dos des cartes.
 * Les `id` correspondent exactement aux valeurs possibles de
 * `GameConfig.colors` côté backend (ex: ["red","blue","green","yellow"]
 * pour une partie standard).
 */
export interface YokaiFamily {
  id: string
  hex: string
  icon: string
}

export const YOKAI_FAMILIES: readonly YokaiFamily[] = [
  { id: 'blue', hex: '#4477AA', icon: 'wave' },
  { id: 'orange', hex: '#EE7733', icon: 'flame' },
  { id: 'green', hex: '#228833', icon: 'leaf' },
  { id: 'red', hex: '#CC3311', icon: 'torii' },
  { id: 'purple', hex: '#AA3377', icon: 'moon' },
  { id: 'yellow', hex: '#DDCC33', icon: 'star' },
  { id: 'sky', hex: '#66CCEE', icon: 'cloud' },
  { id: 'gray', hex: '#777777', icon: 'mountain' },
] as const

const FAMILY_BY_ID = new Map(YOKAI_FAMILIES.map((f) => [f.id, f]))

export function getYokaiFamily(colorId: string): YokaiFamily | undefined {
  return FAMILY_BY_ID.get(colorId)
}

export function getYokaiHex(colorId: string): string {
  return FAMILY_BY_ID.get(colorId)?.hex ?? '#888888'
}

export function getYokaiIcon(colorId: string): string {
  return FAMILY_BY_ID.get(colorId)?.icon ?? 'question'
}
