import { useWebSocket } from '../../hooks/useWebSocket'
import type { ConnectionStatus } from '../../ws/socket'

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connexion…',
  open: 'Connecté',
  reconnecting: 'Reconnexion…',
  closed: 'Déconnecté',
}

const DOT_COLOR: Record<ConnectionStatus, string> = {
  connecting: 'bg-gold',
  open: 'bg-emerald-500',
  reconnecting: 'bg-gold',
  closed: 'bg-lacquer',
}

/** Petit badge affichant le statut courant de la connexion WebSocket. */
export function ConnectionStatusBadge() {
  const { status } = useWebSocket()

  return (
    <div className="flex items-center gap-2 rounded-full border border-gold/20 bg-black/20 px-3 py-1 text-xs text-paper">
      <span className={`h-2 w-2 rounded-full ${DOT_COLOR[status]}`} />
      {LABELS[status]}
    </div>
  )
}
