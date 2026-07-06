import { getYokaiHex } from '../../lib/colors'

interface ClueColorSwatchProps {
  colors: string[] | null
}

/** Pastilles de couleur d'un indice (`null` = indice aveugle, contenu inconnu du viewer). */
export function ClueColorSwatch({ colors }: ClueColorSwatchProps) {
  if (!colors) return <span>❓</span>

  return (
    <div className="flex gap-0.5">
      {colors.map((color) => (
        <span key={color} className="h-3 w-3 rounded-full" style={{ backgroundColor: getYokaiHex(color) }} />
      ))}
    </div>
  )
}
