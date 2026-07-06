import { useContext } from 'react'
import { WebSocketContext, type WebSocketContextValue } from '../ws/WebSocketProvider'

/**
 * Expose `send(action)` et le statut de connexion courant, en consommant
 * le contexte fourni par `WebSocketProvider`.
 */
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return ctx
}
