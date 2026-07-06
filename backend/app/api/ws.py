from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.engine.exceptions import GameError
from app.core.engine.models import Position
from app.core.realtime.connection_manager import broadcast_history, broadcast_state
from app.core.realtime.protocol import (
    BadPayloadError,
    error_event,
    history_event,
    joined_event,
    observation_result_event,
    parse_game_action_payload,
    parse_join_payload,
    parse_move_target,
    parse_set_deduction_payload,
    parse_set_note_payload,
    parse_set_spectator_view_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    engine = websocket.app.state.engine
    game_lock = websocket.app.state.game_lock
    session_manager = websocket.app.state.session_manager
    timer_manager = websocket.app.state.timer_manager

    await websocket.accept()
    pseudo: str | None = None

    try:
        while True:
            raw = await websocket.receive_json()
            if not isinstance(raw, dict):
                await websocket.send_json(error_event("BAD_REQUEST", "message mal formé"))
                continue

            msg_type = raw.get("type")
            payload = raw.get("payload")
            if not isinstance(msg_type, str) or not isinstance(payload, dict):
                await websocket.send_json(error_event("BAD_REQUEST", "message mal formé"))
                continue

            if msg_type == "join":
                try:
                    join_pseudo, player_id = parse_join_payload(payload)
                except BadPayloadError as exc:
                    await websocket.send_json(error_event("BAD_REQUEST", str(exc)))
                    continue
                session = await session_manager.connect(join_pseudo, player_id, websocket, engine)
                pseudo = join_pseudo
                await websocket.send_json(
                    joined_event(session.pseudo, session.player_id, session.role.value)
                )
                timer_manager.sync()
                await broadcast_state(engine, session_manager)
                await broadcast_history(engine, session_manager)
                continue

            if pseudo is None:
                await websocket.send_json(
                    error_event(
                        "NOT_JOINED", "il faut rejoindre la partie avant toute autre action"
                    )
                )
                continue

            if msg_type in ("set_config", "start_game", "back_to_waiting_room"):
                try:
                    async with game_lock:
                        if msg_type == "set_config":
                            engine.update_config(payload)
                        elif msg_type == "start_game":
                            engine.start_game()
                        else:
                            engine.back_to_waiting_room()
                except GameError as exc:
                    await websocket.send_json(error_event(exc.code, exc.message))
                    continue
                timer_manager.sync()
                await broadcast_state(engine, session_manager)
                await broadcast_history(engine, session_manager)
                continue

            if msg_type == "game_action":
                try:
                    action, action_payload = parse_game_action_payload(payload)
                except BadPayloadError as exc:
                    await websocket.send_json(error_event("BAD_REQUEST", str(exc)))
                    continue

                try:
                    if action == "observe":
                        card_id = action_payload.get("card_id")
                        if not isinstance(card_id, int):
                            raise BadPayloadError("card_id manquant ou invalide")
                        async with game_lock:
                            color = engine.handle_observe(pseudo, card_id)
                        await websocket.send_json(observation_result_event(card_id, color))
                    elif action == "skip_observe":
                        async with game_lock:
                            engine.handle_skip_observe(pseudo)
                    elif action == "move":
                        card_id, to = parse_move_target(action_payload)
                        async with game_lock:
                            engine.handle_move(pseudo, card_id, Position(**to))
                    elif action == "skip_move":
                        async with game_lock:
                            engine.handle_skip_move(pseudo)
                    elif action == "undo_move":
                        async with game_lock:
                            engine.handle_undo_move(pseudo)
                    elif action == "reveal_clue":
                        async with game_lock:
                            engine.handle_reveal_clue(pseudo)
                    elif action == "place_clue":
                        clue_id = action_payload.get("clue_id")
                        card_id = action_payload.get("card_id")
                        if not isinstance(clue_id, str) or not isinstance(card_id, int):
                            raise BadPayloadError("clue_id/card_id manquant ou invalide")
                        async with game_lock:
                            engine.handle_place_clue(pseudo, clue_id, card_id)
                    elif action == "skip_clue":
                        async with game_lock:
                            engine.handle_skip_clue(pseudo)
                    elif action == "declare_end":
                        async with game_lock:
                            engine.handle_declare_end(pseudo)
                    else:
                        await websocket.send_json(
                            error_event("BAD_REQUEST", f"action inconnue : {action}")
                        )
                        continue
                except BadPayloadError as exc:
                    await websocket.send_json(error_event("BAD_REQUEST", str(exc)))
                    continue
                except GameError as exc:
                    await websocket.send_json(error_event(exc.code, exc.message))
                    continue

                timer_manager.sync()
                await broadcast_state(engine, session_manager)
                await broadcast_history(engine, session_manager)
                continue

            if msg_type in ("set_note", "set_deduction"):
                try:
                    async with game_lock:
                        if msg_type == "set_note":
                            card_id, text = parse_set_note_payload(payload)
                            engine.set_note(pseudo, card_id, text)
                        else:
                            card_id, forced_color = parse_set_deduction_payload(payload)
                            engine.set_deduction(pseudo, card_id, forced_color)
                except BadPayloadError as exc:
                    await websocket.send_json(error_event("BAD_REQUEST", str(exc)))
                    continue
                except GameError as exc:
                    await websocket.send_json(error_event(exc.code, exc.message))
                    continue
                await broadcast_state(engine, session_manager)
                continue

            if msg_type == "query_history":
                entries = [entry.model_dump(mode="json") for entry in engine.state.history]
                await websocket.send_json(history_event(entries))
                continue

            if msg_type == "set_spectator_view":
                try:
                    target = parse_set_spectator_view_payload(payload)
                except BadPayloadError as exc:
                    await websocket.send_json(error_event("BAD_REQUEST", str(exc)))
                    continue
                session_manager.set_viewing_as(pseudo, target)
                await broadcast_state(engine, session_manager)
                continue

            await websocket.send_json(
                error_event("BAD_REQUEST", f"type de message inconnu : {msg_type}")
            )

    except WebSocketDisconnect:
        if pseudo is not None:
            session_manager.disconnect(pseudo)
            await broadcast_state(engine, session_manager)
