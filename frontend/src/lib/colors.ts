/**
 * Palette Okabe-Ito (daltonisme-safe) des familles de yōkai.
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
  { id: 'blue', hex: '#0072B2', icon: 'wave' },
  { id: 'orange', hex: '#E69F00', icon: 'flame' },
  { id: 'green', hex: '#009E73', icon: 'leaf' },
  { id: 'red', hex: '#D55E00', icon: 'torii' },
  { id: 'purple', hex: '#CC79A7', icon: 'moon' },
  { id: 'yellow', hex: '#F0E442', icon: 'star' },
  { id: 'sky', hex: '#56B4E9', icon: 'cloud' },
  { id: 'gray', hex: '#4D4D4D', icon: 'mountain' },
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
