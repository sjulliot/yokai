import * as Popover from '@radix-ui/react-popover'
import { useUiStore } from '../../store/useUiStore'
import type { CardView } from '../../types/protocol'
import { ColorPicker } from './ColorPicker'
import { NoteTextarea } from './NoteTextarea'

interface DeductionPopoverProps {
  card: CardView
}

/**
 * Bouton + popover de déduction/notes personnelles pour une carte non
 * encore connue. Visibilité pilotée par `useUiStore.openPopoverCardId`.
 */
export function DeductionPopover({ card }: DeductionPopoverProps) {
  const isOpen = useUiStore((s) => s.openPopoverCardId === card.id)
  const setOpenPopoverCardId = useUiStore((s) => s.setOpenPopoverCardId)

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => setOpenPopoverCardId(open ? card.id : null)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gold/40 bg-ink text-[10px] text-gold"
          aria-label="Notes et déductions"
        >
          ✎
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          onClick={(event) => event.stopPropagation()}
          className="z-30 w-56 space-y-3 rounded-lg border border-gold/30 bg-ink p-3 text-paper shadow-lg"
        >
          <ColorPicker card={card} />
          <NoteTextarea cardId={card.id} />
          <Popover.Arrow className="fill-ink" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
