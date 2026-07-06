import type { ClientAction, ServerEvent } from '../types/protocol'

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

type EventListener = (event: ServerEvent) => void
type StatusListener = (status: ConnectionStatus) => void

const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 15_000

/**
 * Enveloppe bas niveau autour d'un WebSocket natif : connexion,
 * reconnexion automatique avec backoff exponentiel + jitter, et
 * dispatch des événements serveur / changements de statut aux abonnés.
 *
 * Ne contient aucune logique de règle du jeu — c'est un pur transport.
 */
export class GameSocket {
  private url: string
  private ws: WebSocket | null = null
  private status: ConnectionStatus = 'closed'
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private explicitlyClosed = false

  private eventListeners = new Set<EventListener>()
  private statusListeners = new Set<StatusListener>()

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    this.explicitlyClosed = false
    this.openSocket()
  }

  private openSocket(): void {
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting')

    const ws = new WebSocket(this.url)
    this.ws = ws

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0
      this.setStatus('open')
    })

    ws.addEventListener('message', (event: MessageEvent) => {
      let parsed: ServerEvent
      try {
        parsed = JSON.parse(event.data as string) as ServerEvent
      } catch {
        return
      }
      this.eventListeners.forEach((listener) => listener(parsed))
    })

    ws.addEventListener('close', () => {
      this.ws = null
      if (this.explicitlyClosed) {
        this.setStatus('closed')
        return
      }
      this.scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      ws.close()
    })
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting')
    const backoff = Math.min(INITIAL_BACKOFF_MS * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS)
    const jitter = backoff * (0.5 + Math.random() * 0.5)
    this.reconnectAttempt += 1

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (!this.explicitlyClosed) this.openSocket()
    }, jitter)
  }

  send(action: ClientAction): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(action))
  }

  close(): void {
    this.explicitlyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.statusListeners.forEach((listener) => listener(status))
  }
}
