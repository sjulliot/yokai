from __future__ import annotations

from dataclasses import dataclass

from fastapi import WebSocket

from app.core.engine.enums import PlayerRole


@dataclass
class PlayerSession:
    pseudo: str
    player_id: str
    websocket: WebSocket | None
    role: PlayerRole
    connected: bool
    last_seen: float
    viewing_as: str | None = None
