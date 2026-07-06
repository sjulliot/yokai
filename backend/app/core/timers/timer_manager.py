from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable

from app.core.engine.engine import GameEngine
from app.core.engine.enums import GamePhase


class TimerManager:
    """Arme/désarme les tâches asyncio de timeout de tour et de partie.

    `sync()` doit être appelée après CHAQUE mutation du moteur (y compris juste après
    `start_game`) : elle compare les deadlines courantes de `engine.state` à celles pour
    lesquelles une tâche est déjà armée, et réarme si besoin. Purement synchrone (elle ne fait que
    créer/annuler des `asyncio.Task`), pour pouvoir être appelée sans `await` juste après un appel
    synchrone au moteur.
    """

    def __init__(
        self,
        engine: GameEngine,
        game_lock: asyncio.Lock,
        broadcast_fn: Callable[[], Awaitable[None]],
    ) -> None:
        self.engine = engine
        self.game_lock = game_lock
        self.broadcast_fn = broadcast_fn

        self._turn_task: asyncio.Task | None = None
        self._turn_deadline: float | None = None
        self._game_task: asyncio.Task | None = None
        self._game_deadline: float | None = None

    def sync(self) -> None:
        state = self.engine.state

        if state.phase != GamePhase.IN_PROGRESS:
            self._cancel_turn_task()
            self._cancel_game_task()
            return

        if state.turn_deadline != self._turn_deadline or self._turn_task is None:
            self._cancel_turn_task()
            if state.turn_deadline is not None:
                self._turn_deadline = state.turn_deadline
                self._turn_task = asyncio.create_task(self._run_turn_timeout(state.turn_deadline))
            else:
                self._turn_deadline = None

        if state.game_deadline != self._game_deadline or self._game_task is None:
            self._cancel_game_task()
            if state.game_deadline is not None:
                self._game_deadline = state.game_deadline
                self._game_task = asyncio.create_task(self._run_game_timeout(state.game_deadline))
            else:
                self._game_deadline = None

    def _cancel_turn_task(self) -> None:
        if self._turn_task is not None:
            self._turn_task.cancel()
        self._turn_task = None
        self._turn_deadline = None

    def _cancel_game_task(self) -> None:
        if self._game_task is not None:
            self._game_task.cancel()
        self._game_task = None
        self._game_deadline = None

    async def _run_turn_timeout(self, deadline: float) -> None:
        await asyncio.sleep(max(0, deadline - time.time()))
        async with self.game_lock:
            if (
                self.engine.state.phase == GamePhase.IN_PROGRESS
                and self.engine.state.turn_deadline == deadline
            ):
                self.engine.force_advance_turn("timeout")
                self.sync()
            else:
                return
        await self.broadcast_fn()

    async def _run_game_timeout(self, deadline: float) -> None:
        await asyncio.sleep(max(0, deadline - time.time()))
        async with self.game_lock:
            if (
                self.engine.state.phase == GamePhase.IN_PROGRESS
                and self.engine.state.game_deadline == deadline
            ):
                self.engine.end_game("game_timeout")
            else:
                return
        await self.broadcast_fn()
