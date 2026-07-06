from __future__ import annotations

import random

import pytest

from app.core.engine import board
from app.core.engine.exceptions import CardLockedError, IllegalMoveError
from app.core.engine.models import GameConfig, Position, YokaiCard


def make_board(cells: dict[int, tuple[int, int, str]], locked: set[int] | None = None):
    """cells: card_id -> (row, col, color)."""
    locked = locked or set()
    return {
        cid: YokaiCard(
            id=cid,
            color=color,
            position=Position(row=r, col=c),
            is_locked=cid in locked,
        )
        for cid, (r, c, color) in cells.items()
    }


def test_is_connected_true_for_single_group():
    positions = {Position(row=0, col=0), Position(row=0, col=1), Position(row=1, col=1)}
    assert board.is_connected(positions) is True


def test_is_connected_false_for_split_groups():
    positions = {Position(row=0, col=0), Position(row=5, col=5)}
    assert board.is_connected(positions) is False


def test_is_connected_empty_is_true():
    assert board.is_connected(set()) is True


def test_generate_initial_layout_is_fully_connected_rectangle():
    config = GameConfig()
    layout = board.generate_initial_layout(config, random.Random(42))
    assert len(layout) == config.total_cards
    positions = {c.position for c in layout.values()}
    assert board.is_connected(positions)


def test_validate_move_rejects_occupied_target():
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (1, 0, "green")})
    with pytest.raises(IllegalMoveError):
        board.validate_move(b, 2, Position(row=0, col=1))


def test_validate_move_rejects_non_adjacent_target():
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue")})
    with pytest.raises(IllegalMoveError):
        board.validate_move(b, 1, Position(row=10, col=10))


def test_validate_move_accepts_legal_move():
    # L shape: (0,0) (0,1) (1,0) ; move (1,0) to (1,1), still connected.
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (1, 0, "green")})
    board.validate_move(b, 2, Position(row=1, col=1))  # should not raise


def test_validate_move_rejects_move_that_splits_group():
    # Line of 3: (0,0)-(0,1)-(0,2). Moving the middle card away would split the group.
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (0, 2, "green")})
    with pytest.raises(IllegalMoveError):
        board.validate_move(b, 1, Position(row=1, col=2))


def test_validate_move_rejects_locked_card():
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (1, 0, "green")}, locked={2})
    with pytest.raises(CardLockedError):
        board.validate_move(b, 2, Position(row=1, col=1))


def test_has_legal_move_true_when_move_exists():
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (1, 0, "green")})
    assert board.has_legal_move(b) is True


def test_has_legal_move_false_when_all_cards_locked():
    b = make_board({0: (0, 0, "red"), 1: (0, 1, "blue"), 2: (1, 0, "green")}, locked={0, 1, 2})
    assert board.has_legal_move(b) is False
