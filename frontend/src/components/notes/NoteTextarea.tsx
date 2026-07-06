import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { useWebSocket } from '../../hooks/useWebSocket'

interface NoteTextareaProps {
  cardId: number
}

/**
 * Note libre personnelle sur une carte. Envoyée au serveur après un court
 * debounce pendant la frappe, et immédiatement au blur.
 */
export function NoteTextarea({ cardId }: NoteTextareaProps) {
  const { send } = useWebSocket()
  const savedText = useGameStore((s) => s.view?.my_notes[cardId]?.text ?? '')
  const [text, setText] = useState(savedText)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setText(savedText)
  }, [savedText])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleChange(value: string) {
    setText(value)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      send({ type: 'set_note', payload: { card_id: cardId, text: value } })
    }, 600)
  }

  function handleBlur() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    send({ type: 'set_note', payload: { card_id: cardId, text } })
  }

  return (
    <div>
      <p className="mb-1 text-xs text-paper/60">Note libre</p>
      <textarea
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        rows={2}
        className="w-full resize-none rounded border border-gold/20 bg-black/30 p-1 text-xs text-paper"
      />
    </div>
  )
}
