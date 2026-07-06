import { useEffect, useRef, useState } from 'react'

/**
 * État local synchronisé sur une valeur serveur, avec envoi débouncé des
 * modifications locales. Tant qu'une modification locale est en attente
 * d'envoi (debounce), les mises à jour serveur entrantes n'écrasent pas la
 * saisie en cours ; une fois le debounce écoulé, le champ redevient
 * synchronisé sur le serveur.
 *
 * Réutilisable pour tout champ texte/nombre de formulaire piloté par l'état
 * serveur (config de partie, etc.).
 */
export function useSyncedValue<T>(
  serverValue: T,
  onCommit: (value: T) => void,
  delayMs = 150,
): [T, (value: T) => void] {
  const [local, setLocal] = useState(serverValue)
  const dirtyRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  useEffect(() => {
    if (!dirtyRef.current) {
      setLocal(serverValue)
    }
  }, [serverValue])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleChange(value: T) {
    setLocal(value)
    dirtyRef.current = true
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      dirtyRef.current = false
      onCommitRef.current(value)
    }, delayMs)
  }

  return [local, handleChange]
}
