from __future__ import annotations

from pydantic import BaseModel, Field


class IncomingMessage(BaseModel):
    """Enveloppe générique de tout message client -> serveur.

    Volontairement permissive (payload: dict libre) : la validation fine des champs se fait au
    niveau des fonctions `parse_*_payload` ci-dessous, appelées depuis `app/api/ws.py`. Toute
    entrée malformée doit se traduire par un événement `error` BAD_REQUEST, jamais par un crash.
    """

    type: str
    payload: dict = Field(default_factory=dict)


class BadPayloadError(Exception):
    """Levée par les parseurs de payload quand le contenu ne respecte pas le contrat attendu."""


def parse_join_payload(payload: dict) -> tuple[str, str | None]:
    pseudo = payload.get("pseudo")
    if not isinstance(pseudo, str) or not pseudo:
        raise BadPayloadError("pseudo manquant ou invalide")
    player_id = payload.get("player_id")
    if player_id is not None and not isinstance(player_id, str):
        raise BadPayloadError("player_id invalide")
    return pseudo, player_id


def parse_game_action_payload(payload: dict) -> tuple[str, dict]:
    action = payload.get("action")
    if not isinstance(action, str) or not action:
        raise BadPayloadError("action manquante ou invalide")
    return action, payload


def parse_move_target(payload: dict) -> tuple[int, dict]:
    card_id = payload.get("card_id")
    to = payload.get("to")
    if not isinstance(card_id, int) or not isinstance(to, dict):
        raise BadPayloadError("payload de déplacement invalide")
    row, col = to.get("row"), to.get("col")
    if not isinstance(row, int) or not isinstance(col, int):
        raise BadPayloadError("position de destination invalide")
    return card_id, {"row": row, "col": col}


def parse_set_note_payload(payload: dict) -> tuple[int, str]:
    card_id = payload.get("card_id")
    text = payload.get("text")
    if not isinstance(card_id, int) or not isinstance(text, str):
        raise BadPayloadError("payload de note invalide")
    return card_id, text


def parse_set_deduction_payload(payload: dict) -> tuple[int, str | None]:
    card_id = payload.get("card_id")
    forced_color = payload.get("forced_color")
    if not isinstance(card_id, int):
        raise BadPayloadError("payload de déduction invalide")
    if forced_color is not None and not isinstance(forced_color, str):
        raise BadPayloadError("forced_color invalide")
    return card_id, forced_color


def parse_set_deduction_exclusion_payload(payload: dict) -> tuple[int, list[str]]:
    card_id = payload.get("card_id")
    excluded_colors = payload.get("excluded_colors")
    if not isinstance(card_id, int):
        raise BadPayloadError("payload d'exclusion invalide")
    if not isinstance(excluded_colors, list) or not all(
        isinstance(color, str) for color in excluded_colors
    ):
        raise BadPayloadError("excluded_colors invalide")
    return card_id, excluded_colors


def parse_kick_player_payload(payload: dict) -> str:
    target = payload.get("pseudo")
    if not isinstance(target, str) or not target:
        raise BadPayloadError("pseudo manquant ou invalide")
    return target


def parse_set_spectator_view_payload(payload: dict) -> str | None:
    target = payload.get("target")
    if target is not None and not isinstance(target, str):
        raise BadPayloadError("target invalide")
    return target


# ------------------------------------------------------------------
# Construction des messages sortants
# ------------------------------------------------------------------


def joined_event(pseudo: str, player_id: str, role: str) -> dict:
    return {"type": "joined", "payload": {"pseudo": pseudo, "player_id": player_id, "role": role}}


def state_event(view: dict) -> dict:
    return {"type": "state", "payload": view}


def observation_result_event(card_id: int, color: str) -> dict:
    return {"type": "observation_result", "payload": {"card_id": card_id, "color": color}}


def history_event(entries: list[dict]) -> dict:
    return {"type": "history", "payload": {"entries": entries}}


def error_event(code: str, message: str) -> dict:
    return {"type": "error", "payload": {"code": code, "message": message}}
