from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import WebSocket

from app.core.engine.engine import GameEngine
from app.core.engine.enums import GamePhase

from .player_session import PlayerSession

logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self) -> None:
        self.sessions: dict[str, PlayerSession] = {}

    async def connect(
        self, pseudo: str, player_id: str | None, websocket: WebSocket, engine: GameEngine
    ) -> PlayerSession:
        existing = self.sessions.get(pseudo)
        if existing is not None:
            if (
                existing.connected
                and existing.websocket is not None
                and existing.websocket is not websocket
            ):
                try:
                    await existing.websocket.close(code=4001, reason="connected elsewhere")
                except Exception:
                    logger.warning(
                        "failed to close previous websocket for %s", pseudo, exc_info=True
                    )
            existing.websocket = websocket
            existing.connected = True
            existing.last_seen = time.time()
            return existing

        role = engine.register_player(pseudo)
        session = PlayerSession(
            pseudo=pseudo,
            player_id=player_id or str(uuid.uuid4()),
            websocket=websocket,
            role=role,
            connected=True,
            last_seen=time.time(),
        )
        self.sessions[pseudo] = session
        return session

    def disconnect(self, pseudo: str) -> None:
        session = self.sessions.get(pseudo)
        if session is None:
            return
        session.connected = False
        session.websocket = None
        session.last_seen = time.time()

    def set_viewing_as(self, pseudo: str, target: str | None) -> None:
        session = self.sessions.get(pseudo)
        if session is None:
            return
        from app.core.engine.enums import PlayerRole

        if session.role != PlayerRole.SPECTATOR:
            return
        session.viewing_as = target

    def connected_pseudos(self) -> set[str]:
        return {pseudo for pseudo, session in self.sessions.items() if session.connected}

    async def reap_stale_waiting_players(
        self,
        engine: GameEngine,
        game_lock: asyncio.Lock,
        grace_seconds: int,
        broadcast_fn: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        while True:
            await asyncio.sleep(10)
            async with game_lock:
                if engine.state.phase != GamePhase.WAITING_ROOM:
                    continue
                now = time.time()
                stale_pseudos = [
                    pseudo
                    for pseudo, session in self.sessions.items()
                    if not session.connected and (now - session.last_seen) > grace_seconds
                ]
                if not stale_pseudos:
                    continue
                for pseudo in stale_pseudos:
                    engine.remove_waiting_player(pseudo)
                    self.sessions.pop(pseudo, None)
            if broadcast_fn is not None:
                await broadcast_fn()
