# Yōkai en ligne

Webapp pour jouer au jeu coopératif [Yōkai](regles.md) (IELLO) en ligne entre collègues. Backend
FastAPI (toute la logique de jeu), frontend React (affichage + interactions).

## Démarrer

### Avec Docker (recommandé)

```bash
docker compose up -d --build
```

Sert l'app sur **http://localhost** (port 80, prêt à être lié à un tunnel ngrok). `docker compose
down -v` pour tout arrêter et nettoyer.

### En développement (sans Docker)

```bash
# Backend
cd backend
uv sync --group dev
uv run uvicorn app.main:app --reload --port 8000

# Frontend (autre terminal)
cd frontend
cp .env.example .env   # VITE_WS_URL=ws://localhost:8000/ws
npm install
npm run dev
```

## Structure du dépôt

```
backend/
  app/
    core/engine/       # moteur de jeu PUR (aucune dépendance réseau) — la logique du jeu vit ici
      models.py           # GameConfig, GameState, YokaiCard, ClueCard, AffinityCard, HistoryEntry...
      engine.py           # GameEngine : state machine partie + tour, toutes les actions de jeu
      board.py            # génération du plateau, adjacence, vérification de connexité
      clues.py            # génération du deck d'indices (table officielle + extrapolation custom)
      deduction.py        # calcul des "couleurs possibles" par carte pour un joueur
      rules.py            # registre des formes d'Objectif ("rectangle"/"square"/"line"/"random")
      scoring.py          # check_victory() (vraies couleurs) vs compute_score() (classement)
      exceptions.py       # une exception par type de coup invalide (.code exploitable par le réseau)
    core/session/       # identité par pseudo, reconnexion, rôle joueur/spectateur
    core/realtime/       # protocole WebSocket + calcul de la vue filtrée par destinataire (anti-triche)
      views.py            # LE fichier qui décide ce que chaque joueur/spectateur a le droit de voir
      protocol.py          # parsing des messages entrants, construction des messages sortants
      connection_manager.py  # diffusion de l'état à toutes les sessions connectées
    core/timers/         # timers de tour/partie asynchrones (asyncio)
    api/                 # endpoint WebSocket unique (/ws) + healthcheck (/api/health)
    main.py              # assemblage FastAPI (lifespan, CORS, état global en mémoire)
  tests/engine/         # pytest sur le moteur pur (54 tests)
  tests/test_views_filtering.py  # tests anti-triche sur les vues filtrées

frontend/
  src/
    types/protocol.ts    # contrat réseau côté client — miroir exact de core/realtime/protocol.py
    ws/                  # client WebSocket (reconnexion auto) + WebSocketProvider (contexte React)
    store/               # Zustand : useGameStore (miroir strict du serveur), useUiStore, useIdentityStore,
                          # useObservationStore (révélation éphémère), useErrorStore, useHistoryStore
    pages/               # EntryScreen (pseudo) / WaitingRoom (options de partie) / GameScreen (plateau)
    components/
      board/              # plateau, drag & drop (@dnd-kit)
      clues/              # pioche + indices révélés
      turn/               # bannière de tour, stepper de phase, timers
      notes/              # popover de déduction / notes libres par carte
      spectator/          # sélecteur de point de vue (omniscient ou "voir comme <joueur>")
      history/            # frise chronologique + drawer (voir limitation ci-dessous)
      waitingroom/        # tous les contrôles d'options de partie

nginx/nginx.conf        # reverse proxy (statique + proxy /api et /ws vers le backend)
docker-compose.yml      # backend + build frontend + nginx, tout sur le port 80
```

## Le protocole réseau

Un seul WebSocket (`/ws`). Enveloppe `{"type": ..., "payload": ...}` dans les deux sens. Le contrat
exact est dupliqué à l'identique dans deux fichiers qu'il faut garder synchronisés si on le fait
évoluer :
- `backend/app/core/realtime/protocol.py`
- `frontend/src/types/protocol.ts`

Le cœur de la sécurité du jeu (empêcher un joueur de voir une couleur qu'il ne devrait pas
connaître) est entièrement dans `backend/app/core/realtime/views.py::build_player_view` — c'est LE
fichier à lire/auditer en premier si un doute de triche apparaît.

## Options de partie (waiting room)

Toutes indépendantes et combinables (pas de "niveaux" façon jeu physique) : nombre de couleurs et
de cartes par couleur, nombre d'indices par taille de combinaison (1/2/3 couleurs), pile d'indices,
indices aveugles, nombre de cartes Affinité, carte Objectif (`rectangle`/`square`/`line`/`random` —
`random` tire une forme au hasard une seule fois au lancement de la partie, fixée pour toute sa
durée), mémoire parfaite (activée par défaut), timers de tour/partie, activation de l'historique.

## Historique complet avec replay animé

L'entrée `start_game` de l'historique contient les positions initiales de toutes les cartes
(`details.positions` — sans risque, une position ne révèle jamais de couleur). Le client reconstruit
l'état du plateau à n'importe quel instant en rejouant en avant, depuis ces positions initiales, les
`move`/`place_clue` publics jusqu'au point consulté (`frontend/src/components/history/reconstructBoard.ts`).
Dans le drawer historique, les flèches **← →** du clavier naviguent pas à pas dans la partie ; comme
le plateau réutilise le même composant `YokaiCard` (animations Framer Motion) que le direct, les
cartes se déplacent visuellement d'une étape à l'autre. Seules `known_color`/`possible_colors`
restent celles de la connaissance **actuelle** du joueur (elle ne fait que s'enrichir avec le temps,
jamais régresser, donc aucun risque à l'afficher en survolant le passé).

## Tests

```bash
cd backend && uv run pytest -q        # 54 tests, moteur de jeu + vues filtrées
cd frontend && npm run build          # vérification TypeScript
cd frontend && npm run test           # tests Vitest
```

## Déploiement distant (au-delà du LAN/local)

`nginx/nginx.conf` sert du HTTP simple sur le port 80. Pour exposer le jeu au-delà d'un tunnel
ngrok (domaine réel, HTTPS), ajouter un bloc `listen 443 ssl` avec un certificat — voir le
commentaire déjà présent dans ce fichier.
