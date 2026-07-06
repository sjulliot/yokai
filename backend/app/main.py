from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import http, ws
from app.config import Settings
from app.core.engine.engine import GameEngine
from app.core.realtime.connection_manager import broadcast_history, broadcast_state
from app.core.session.session_manager import SessionManager
from app.core.timers.timer_manager import TimerManager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()

    engine = GameEngine()
    game_lock = asyncio.Lock()
    session_manager = SessionManager()

    async def broadcast() -> None:
        await broadcast_state(engine, session_manager)
        await broadcast_history(engine, session_manager)

    timer_manager = TimerManager(engine, game_lock, broadcast)

    app.state.engine = engine
    app.state.game_lock = game_lock
    app.state.session_manager = session_manager
    app.state.timer_manager = timer_manager

    reaper_task = asyncio.create_task(
        session_manager.reap_stale_waiting_players(
            engine,
            game_lock,
            settings.waiting_room_disconnect_grace_seconds,
            broadcast_fn=broadcast,
        )
    )

    try:
        yield
    finally:
        reaper_task.cancel()


def create_app() -> FastAPI:
    settings = Settings()
    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(ws.router)
    app.include_router(http.router)
    return app


app = create_app()
