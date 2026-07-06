from __future__ import annotations

import math
import random

from .exceptions import CardLockedError, CardNotFoundError, IllegalMoveError
from .models import ORTHOGONAL_OFFSETS, GameConfig, Position, YokaiCard


def compute_grid_size(total_cards: int) -> tuple[int, int]:
    """Dimensions d'une grille presque carrée contenant exactement total_cards cases."""
    rows = math.ceil(math.sqrt(total_cards))
    cols = math.ceil(total_cards / rows)
    return rows, cols


def generate_initial_layout(config: GameConfig, rng: random.Random) -> dict[int, YokaiCard]:
    """Mise en place initiale : grille rectangulaire pleine (pas de case vide), couleurs mélangées.

    Après le début de la partie, le plateau n'est plus forcément rectangulaire : les cartes
    peuvent être déplacées librement (voir validate_move) tant que la connexité est préservée.
    """
    total_cards = config.total_cards
    rows, cols = compute_grid_size(total_cards)
    positions = [Position(row=r, col=c) for r in range(rows) for c in range(cols)][:total_cards]

    colors = [color for color in config.colors for _ in range(config.cards_per_color)]
    rng.shuffle(colors)
    rng.shuffle(positions)

    return {i: YokaiCard(id=i, color=colors[i], position=positions[i]) for i in range(total_cards)}


def orthogonal_neighbors(pos: Position) -> list[Position]:
    return [pos + offset for offset in ORTHOGONAL_OFFSETS]


def is_connected(positions: set[Position]) -> bool:
    """Vrai si toutes les positions forment un unique groupe connexe (adjacence par les côtés)."""
    if not positions:
        return True
    start = next(iter(positions))
    seen = {start}
    stack = [start]
    while stack:
        current = stack.pop()
        for neighbor in orthogonal_neighbors(current):
            if neighbor in positions and neighbor not in seen:
                seen.add(neighbor)
                stack.append(neighbor)
    return seen == positions


def validate_move(board: dict[int, YokaiCard], card_id: int, to: Position) -> None:
    """Valide un déplacement de carte selon les règles officielles :
    - la carte existe et n'est pas verrouillée
    - la case cible est libre
    - la case cible est adjacente à au moins une autre carte du groupe
    - une fois déplacée, l'ensemble des cartes reste un unique groupe connexe

    Ne mute rien ; lève une GameError si le coup est illégal.
    """
    card = board.get(card_id)
    if card is None:
        raise CardNotFoundError(f"carte {card_id} introuvable")
    if card.is_locked:
        raise CardLockedError(
            f"la carte {card_id} est verrouillée, elle ne peut plus être déplacée"
        )

    other_positions = {c.position for c in board.values() if c.id != card_id}
    if to in other_positions:
        raise IllegalMoveError("la case cible est déjà occupée")
    if to not in {n for pos in other_positions for n in orthogonal_neighbors(pos)}:
        raise IllegalMoveError("la case cible doit être adjacente à au moins une autre carte")

    resulting_positions = other_positions | {to}
    if not is_connected(resulting_positions):
        raise IllegalMoveError("ce déplacement séparerait les cartes en plusieurs groupes")


def apply_move(board: dict[int, YokaiCard], card_id: int, to: Position) -> None:
    """Applique le déplacement (suppose déjà validé par validate_move)."""
    board[card_id].position = to


def has_legal_move(board: dict[int, YokaiCard]) -> bool:
    """Vrai s'il existe au moins un déplacement légal sur le plateau courant."""
    movable = [c for c in board.values() if not c.is_locked]
    if not movable:
        return False
    all_positions = {c.position for c in board.values()}
    candidate_targets = {
        n for pos in all_positions for n in orthogonal_neighbors(pos)
    } - all_positions
    for card in movable:
        other_positions = all_positions - {card.position}
        for target in candidate_targets:
            if target in {n for pos in other_positions for n in orthogonal_neighbors(pos)}:
                if is_connected(other_positions | {target}):
                    return True
    return False
