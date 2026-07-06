from __future__ import annotations

import logging

from app.core.engine.engine import GameEngine
from app.core.session.session_manager import SessionManager

from . import views

logger = logging.getLogger(__name__)


async def broadcast_state(engine: GameEngine, session_manager: SessionManager) -> None:
    connected_pseudos = session_manager.connected_pseudos()
    for session in list(session_manager.sessions.values()):
        if not session.connected or session.websocket is None:
            continue
        view = views.build_player_view(
            state=engine.state,
            pseudo=session.pseudo,
            my_role=session.role,
            viewing_as=session.viewing_as,
            connected_pseudos=connected_pseudos,
        )
        try:
            await session.websocket.send_json({"type": "state", "payload": view})
        except Exception:
            logger.warning("failed to send state to %s", session.pseudo, exc_info=True)


async def broadcast_history(engine: GameEngine, session_manager: SessionManager) -> None:
    """Diffuse l'historique public à tous les clients connectés.

    Contrairement à `broadcast_state`, l'historique n'a pas de vue par joueur :
    un seul payload identique pour tout le monde. Permet à un slider toujours
    visible côté client de rester à jour sans avoir à renvoyer `query_history`.
    """
    entries = [entry.model_dump(mode="json") for entry in engine.state.history]
    message = {"type": "history", "payload": {"entries": entries}}
    for session in list(session_manager.sessions.values()):
        if not session.connected or session.websocket is None:
            continue
        try:
            await session.websocket.send_json(message)
        except Exception:
            logger.warning("failed to send history to %s", session.pseudo, exc_info=True)
