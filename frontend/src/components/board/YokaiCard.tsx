import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { useObservationStore } from '../../store/useObservationStore'
import { getYokaiHex, getYokaiIcon } from '../../lib/colors'
import { getPlayerColor, getPlayerMonogram } from '../../lib/playerColor'
import type { CardView } from '../../types/protocol'
import { DeductionPopover } from '../notes/DeductionPopover'
import { ClueColorSwatch } from '../clues/ClueColorSwatch'

const ICON_EMOJI: Record<string, string> = {
  wave: '🌊',
  flame: '🔥',
  leaf: '🍃',
  torii: '⛩️',
  moon: '🌙',
  star: '⭐',
  cloud: '☁️',
  mountain: '⛰️',
  question: '❓',
}

interface YokaiCardProps {
  card: CardView
  style?: CSSProperties
  draggable: boolean
  clueDropTarget?: boolean
  onActivate: () => void
}

/**
 * Une carte Yōkai du plateau. États visuels (priorité décroissante) :
 * 1. partie terminée -> face visible, vraie couleur
 * 2. verrouillée -> dos + cadenas, teinté si un indice à 1 couleur l'a déjà identifiée
 * 3. couleur connue (observée) -> dos teinté + icône de famille
 * 4. sinon -> dos neutre
 * Le flip 3D (Framer Motion) ne s'active que pour (1) et pour les cartes
 * révélées par une action `observe` du tour en cours.
 */
export function YokaiCard({ card, style, draggable, clueDropTarget = false, onActivate }: YokaiCardProps) {
  const phase = useGameStore((s) => s.view?.phase)
  const reveal = useObservationStore((s) => s.reveals.find((r) => r.card_id === card.id))
  const placedClueColors = useGameStore((s) => {
    if (!card.is_locked || !s.view) return null
    const clueId = s.view.played_clues[card.id]
    const clue = clueId ? s.view.revealed_clues.find((c) => c.id === clueId) : undefined
    return clue?.colors ?? null
  })

  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { cardId: card.id },
    disabled: !draggable,
  })
  const { setNodeRef: setDropRef, isOver: isClueDragOver } = useDroppable({
    id: `clue-drop-${card.id}`,
    data: { cardId: card.id },
    disabled: !clueDropTarget,
  })
  function setRefs(node: HTMLElement | null) {
    setNodeRef(node)
    setDropRef(node)
  }

  const isFlashRevealed = reveal !== undefined
  const isFrontShown = phase === 'finished' || isFlashRevealed
  const frontColor = phase === 'finished' ? card.known_color : isFlashRevealed ? reveal.color : null

  const showNoteTrigger = card.known_color === null && phase !== 'finished'
  const forcedColor = useGameStore((s) => s.view?.my_notes[card.id]?.forced_color ?? null)

  // Un indice à plusieurs couleurs posé sur la carte ne rend pas `known_color` public,
  // mais si j'ai personnellement déduit/observé sa couleur, c'est plus précis que le tag
  // d'indice brut : on l'affiche à sa place tout en gardant le swatch d'indice visible.
  const effectiveColor = card.known_color ?? (card.is_locked ? forcedColor : null)

  const backTint = useMemo(() => {
    return effectiveColor ? getYokaiHex(effectiveColor) : null
  }, [effectiveColor])

  const wrapperStyle: CSSProperties = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 20 : undefined,
    cursor: draggable ? 'grab' : 'default',
    touchAction: draggable ? 'none' : undefined,
  }

  return (
    <motion.div
      layout={!isDragging}
      layoutId={isDragging ? undefined : `yokai-card-${card.id}`}
      ref={setRefs}
      style={wrapperStyle}
      className={`relative ${clueDropTarget && isClueDragOver ? 'ring-2 ring-gold' : ''}`}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onActivate()
        }}
        style={{ perspective: '600px' }}
        className="h-full w-full"
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFrontShown ? 180 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Dos de la carte */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border-2 text-xs"
            style={{
              backfaceVisibility: 'hidden',
              borderColor: backTint ?? 'rgba(212,166,87,0.3)',
              backgroundColor: backTint ? `${backTint}33` : 'rgba(0,0,0,0.3)',
            }}
          >
            {card.is_locked ? (
              placedClueColors ? (
                <ClueColorSwatch colors={placedClueColors} />
              ) : (
                <span className="text-lg">🔒</span>
              )
            ) : !effectiveColor ? (
              <span className="text-lg text-paper/30">?</span>
            ) : null}
            {effectiveColor && (
              <span className="text-lg">{ICON_EMOJI[getYokaiIcon(effectiveColor)] ?? '❓'}</span>
            )}
          </div>

          {/* Face de la carte (vraie couleur) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border-2 text-xs"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderColor: frontColor ? getYokaiHex(frontColor) : '#888888',
              backgroundColor: frontColor ? `${getYokaiHex(frontColor)}55` : '#333333',
            }}
          >
            {frontColor && <span className="text-xl">{ICON_EMOJI[getYokaiIcon(frontColor)] ?? '❓'}</span>}
          </div>
        </motion.div>
      </div>

      {card.observed_by.length > 0 && (
        <div className="pointer-events-none absolute -top-1.5 -left-1.5 z-10 flex -space-x-1">
          {card.observed_by.map((pseudo) => (
            <span
              key={pseudo}
              title={`Observée par ${pseudo}`}
              className="flex h-4 w-4 items-center justify-center rounded-full border border-black/40 text-[8px] font-bold text-black"
              style={{ backgroundColor: getPlayerColor(pseudo) }}
            >
              {getPlayerMonogram(pseudo)}
            </span>
          ))}
        </div>
      )}

      {showNoteTrigger && forcedColor && (
        <div
          title={`Ma déduction : ${forcedColor}`}
          className="pointer-events-none absolute -bottom-1.5 -right-1.5 z-10 h-4 w-4 rounded-full border-2 border-gold"
          style={{ backgroundColor: getYokaiHex(forcedColor), boxShadow: '0 0 0 2px rgba(212,166,87,0.6)' }}
        />
      )}

      {showNoteTrigger && <DeductionPopover card={card} />}
    </motion.div>
  )
}
