import { createContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { GameSocket, type ConnectionStatus } from './socket'
import { useIdentityStore } from '../store/useIdentityStore'
import { useGameStore } from '../store/useGameStore'
import { useErrorStore } from '../store/useErrorStore'
import { useObservationStore } from '../store/useObservationStore'
import { useHistoryStore } from '../store/useHistoryStore'
import type { ClientAction } from '../types/protocol'

export interface WebSocketContextValue {
  status: ConnectionStatus
  send: (action: ClientAction) => void
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null)

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('closed')
  const socketRef = useRef<GameSocket | null>(null)

  useEffect(() => {
    if (!WS_URL) {
      console.error('VITE_WS_URL is not defined — see .env.example')
      return
    }

    const socket = new GameSocket(WS_URL)
    socketRef.current = socket

    const unsubscribeStatus = socket.onStatus((next) => {
      setStatus(next)
      if (next === 'open') {
        const { pseudo, playerId } = useIdentityStore.getState()
        if (pseudo) {
          socket.send({ type: 'join', payload: { pseudo, player_id: playerId } })
        }
      }
    })

    const unsubscribeEvent = socket.onEvent((event) => {
      switch (event.type) {
        case 'joined':
          useIdentityStore.getState().setPlayerId(event.payload.player_id)
          break
        case 'state':
          useGameStore.getState().applyState(event.payload)
          break
        case 'observation_result':
          useObservationStore.getState().setReveal(event.payload)
          break
        case 'history':
          useHistoryStore.getState().setEntries(event.payload.entries)
          break
        case 'error':
          useErrorStore.getState().setError(event.payload)
          break
      }
    })

    socket.connect()

    return () => {
      unsubscribeStatus()
      unsubscribeEvent()
      socket.close()
      socketRef.current = null
    }
  }, [])

  const send = (action: ClientAction): void => {
    socketRef.current?.send(action)
  }

  return <WebSocketContext.Provider value={{ status, send }}>{children}</WebSocketContext.Provider>
}
