from __future__ import annotations

import random
from collections.abc import Callable

from .models import YokaiCard

# Registre extensible de formes nommées pour la carte Objectif. Chaque vérificateur reçoit
# uniquement les positions du plateau (les couleurs n'entrent pas en jeu pour une forme).
# À enrichir avec les formes exactes des cartes Objectif physiques si besoin.
ShapeChecker = Callable[[dict[int, YokaiCard]], bool]


def _is_fully_filled_rectangle(board: dict[int, YokaiCard]) -> bool:
    positions = {c.position for c in board.values()}
    rows = {p.row for p in positions}
    cols = {p.col for p in positions}
    expected = (max(rows) - min(rows) + 1) * (max(cols) - min(cols) + 1)
    return expected == len(positions)


def _is_square(board: dict[int, YokaiCard]) -> bool:
    positions = {c.position for c in board.values()}
    rows = {p.row for p in positions}
    cols = {p.col for p in positions}
    height = max(rows) - min(rows) + 1
    width = max(cols) - min(cols) + 1
    return height == width and _is_fully_filled_rectangle(board)


def _is_line(board: dict[int, YokaiCard]) -> bool:
    positions = {c.position for c in board.values()}
    rows = {p.row for p in positions}
    cols = {p.col for p in positions}
    return len(rows) == 1 or len(cols) == 1


SHAPE_CHECKERS: dict[str, ShapeChecker] = {
    "rectangle": _is_fully_filled_rectangle,
    "square": _is_square,
    "line": _is_line,
}


def check_objective(board: dict[int, YokaiCard], shape_name: str) -> bool:
    checker = SHAPE_CHECKERS.get(shape_name)
    if checker is None:
        raise ValueError(f"forme d'objectif inconnue : {shape_name}")
    return checker(board)


def resolve_objective_shape(shape_name: str, rng: random.Random) -> str:
    """Tire une forme concrète au hasard si `shape_name == "random"`, sinon la renvoie telle quelle.

    Appelé une seule fois au démarrage de la partie (`GameEngine.start_game`) : la forme tirée est
    figée dans `state.objective_card.shape_name` pour le reste de la partie, jamais re-tirée.
    """
    if shape_name == "random":
        return rng.choice(list(SHAPE_CHECKERS.keys()))
    return shape_name


__all__ = ["SHAPE_CHECKERS", "check_objective", "resolve_objective_shape"]
