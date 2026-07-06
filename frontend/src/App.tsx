import { useGameStore, type GameStatus } from './store/useGameStore'
import { ConnectionStatusBadge } from './components/layout/ConnectionStatusBadge'
import { EntryScreen } from './pages/EntryScreen'
import { WaitingRoom } from './pages/WaitingRoom'
import { GameScreen } from './pages/GameScreen'

/**
 * Point d'entrée unique de l'UI : un `switch` sur le statut dérivé de
 * l'état serveur (`useGameStore().status`) choisit l'écran affiché.
 * Pas de router — la navigation est intégralement pilotée par le serveur.
 */
function App() {
  const status = useGameStore((state) => state.status)

  return (
    <div className="relative">
      <div className="absolute right-4 top-4 z-10">
        <ConnectionStatusBadge />
      </div>
      <Screen status={status} />
    </div>
  )
}

function Screen({ status }: { status: GameStatus }) {
  switch (status) {
    case 'idle':
      return <EntryScreen />
    case 'waiting':
      return <WaitingRoom />
    case 'playing':
      // Note : "finished" réutilise aussi GameScreen (voir case ci-dessous) :
      // le PlayerView contient déjà `result` en phase finished, un futur
      // agent pourra y brancher un écran de fin dédié.
      return <GameScreen />
    case 'finished':
      return <GameScreen />
    default:
      return null
  }
}

export default App
