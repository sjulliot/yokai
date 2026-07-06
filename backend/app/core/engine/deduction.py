from __future__ import annotations

from .models import GameState, PlayerKnowledge


def compute_possible_colors(state: GameState, knowledge: PlayerKnowledge) -> dict[int, list[str]]:
    """Couleurs encore possibles pour chaque carte, du point de vue d'un joueur donné.

    Ne prend en compte que l'information PUBLIQUE (indices non-aveugles posés) et la déduction
    manuelle forcée par ce joueur, qui a toujours priorité absolue et écrase le calcul automatique.
    Ne préjuge pas de ce que le joueur "connaît" par ailleurs (observation, perfect memory) — c'est
    au calcul de la vue (core/realtime/views.py) de décider d'utiliser ce résultat ou non pour une
    carte donnée.
    """
    result: dict[int, list[str]] = {}
    for card in state.board.values():
        note = knowledge.notes.get(card.id)
        if note and note.forced_color:
            result[card.id] = [note.forced_color]
            continue

        possible = set(state.config.colors)
        if card.is_locked and not card.locked_face_down:
            clue_id = state.played_clues.get(card.id)
            clue = (
                next((c for c in state.revealed_clues if c.id == clue_id), None)
                if clue_id
                else None
            )
            if clue:
                possible &= set(clue.colors)
        result[card.id] = sorted(possible)
    return result
