from __future__ import annotations

from app.core.engine import deduction
from app.core.engine.enums import GamePhase, PlayerRole
from app.core.engine.models import GameState, PlayerKnowledge, YokaiCard


def _resolve_card_knowledge(
    state: GameState,
    card: YokaiCard,
    knowledge: PlayerKnowledge,
    possible_map: dict[int, list[str]],
) -> tuple[str | None, list[str]]:
    """Calcule (known_color, possible_colors) pour une carte, du point de vue de `knowledge`.

    Ne JAMAIS exposer `card.color` brut autrement que via ce calcul — cœur de la sécurité
    anti-triche (voir doc du contrat réseau).
    """
    if card.is_locked and not card.locked_face_down:
        clue_id = state.played_clues.get(card.id)
        clue = next((c for c in state.revealed_clues if c.id == clue_id), None) if clue_id else None
        if clue is not None and len(clue.colors) == 1:
            return clue.colors[0], []
        return None, possible_map.get(card.id, [])

    if state.config.perfect_memory and card.id in knowledge.observations:
        return knowledge.observations[card.id].color, []

    return None, possible_map.get(card.id, [])


def build_player_view(
    state: GameState,
    pseudo: str,
    my_role: PlayerRole,
    viewing_as: str | None,
    connected_pseudos: set[str],
) -> dict:
    finished = state.phase == GamePhase.FINISHED

    omniscient = False
    effective_viewing_as: str | None = None
    knowledge: PlayerKnowledge | None = None

    if my_role == PlayerRole.SPECTATOR:
        if viewing_as is not None and viewing_as in state.players_order:
            effective_viewing_as = viewing_as
            knowledge = state.players.get(viewing_as)
            if knowledge is None:
                omniscient = True
                effective_viewing_as = None
        else:
            omniscient = True
    else:
        knowledge = state.players.get(pseudo)
        if knowledge is None:
            # Ne devrait pas arriver (un joueur a toujours une entrée dans state.players une fois
            # enregistré) ; on retombe sur une vue "aucune information" plutôt que de crasher.
            knowledge = PlayerKnowledge(pseudo=pseudo)

    possible_map = (
        deduction.compute_possible_colors(state, knowledge) if knowledge is not None else {}
    )

    cards = []
    for card in sorted(state.board.values(), key=lambda c: c.id):
        if finished:
            known_color: str | None = card.color
            possible: list[str] = []
        elif omniscient:
            known_color = card.color
            possible = []
        else:
            known_color, possible = _resolve_card_knowledge(state, card, knowledge, possible_map)
        cards.append(
            {
                "id": card.id,
                "position": {"row": card.position.row, "col": card.position.col},
                "is_locked": card.is_locked,
                "known_color": known_color,
                "possible_colors": possible,
                "observed_by": list(card.observed_by),
            }
        )

    revealed_clues = []
    for clue in state.revealed_clues:
        colors = None if (clue.blind and not omniscient) else list(clue.colors)
        revealed_clues.append(
            {
                "id": clue.id,
                "colors": colors,
                "order_revealed": clue.order_revealed,
                "played_on_card_id": clue.played_on_card_id,
            }
        )

    my_notes: dict[int, dict] = {}
    if knowledge is not None:
        my_notes = {
            card_id: {"text": note.text, "forced_color": note.forced_color}
            for card_id, note in knowledge.notes.items()
        }

    if omniscient:
        my_affinity_cards = [ac.model_dump(mode="json") for ac in state.affinity_cards]
    else:
        target_pseudo = effective_viewing_as if my_role == PlayerRole.SPECTATOR else pseudo
        my_affinity_cards = [
            ac.model_dump(mode="json")
            for ac in state.affinity_cards
            if ac.holder_pseudo == target_pseudo
        ]

    is_my_turn = (
        my_role == PlayerRole.PLAYER
        and state.phase == GamePhase.IN_PROGRESS
        and pseudo == state.current_player
    )

    in_progress = state.phase == GamePhase.IN_PROGRESS

    return {
        "my_pseudo": pseudo,
        "my_role": my_role.value,
        "viewing_as": effective_viewing_as if my_role == PlayerRole.SPECTATOR else None,
        "phase": state.phase.value,
        "config": state.config.model_dump(mode="json"),
        "cards": cards,
        "clue_pile_remaining": len(state.clue_pile),
        "revealed_clues": revealed_clues,
        "played_clues": dict(state.played_clues),
        "players_order": list(state.players_order),
        "connected_players": sorted(connected_pseudos),
        "current_player": state.current_player if in_progress else None,
        "current_turn_phase": state.current_turn_phase.value if in_progress else None,
        "observations_this_turn": state.observations_this_turn,
        "is_my_turn": is_my_turn,
        "turn_deadline": state.turn_deadline,
        "game_deadline": state.game_deadline,
        "my_notes": my_notes,
        "my_affinity_cards": my_affinity_cards,
        "objective_shape": state.objective_card.shape_name if state.objective_card else None,
        "result": state.result.model_dump(mode="json") if state.result else None,
        "history_enabled": state.config.history_enabled,
    }
