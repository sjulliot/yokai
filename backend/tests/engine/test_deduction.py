from __future__ import annotations

from app.core.engine.deduction import compute_possible_colors
from app.core.engine.models import (
    ClueCard,
    GameConfig,
    GameState,
    PlayerKnowledge,
    PlayerNote,
    Position,
    YokaiCard,
)


def build_state() -> GameState:
    config = GameConfig(colors=["red", "blue", "green", "yellow"], cards_per_color=2)
    board = {
        0: YokaiCard(
            id=0,
            color="red",
            position=Position(row=0, col=0),
            is_locked=True,
            locked_by_clue_id="clue-0",
            locked_face_down=False,
        ),
        1: YokaiCard(id=1, color="blue", position=Position(row=0, col=1)),
        2: YokaiCard(
            id=2,
            color="green",
            position=Position(row=1, col=0),
            is_locked=True,
            locked_by_clue_id="clue-1",
            locked_face_down=True,  # indice aveugle : ne doit pas réduire les couleurs possibles
        ),
        3: YokaiCard(id=3, color="yellow", position=Position(row=1, col=1)),
    }
    clue = ClueCard(
        id="clue-0", colors=["red", "blue"], revealed=True, order_revealed=0, played_on_card_id=0
    )
    blind_clue = ClueCard(
        id="clue-1",
        colors=["green"],
        revealed=True,
        blind=True,
        order_revealed=1,
        played_on_card_id=2,
    )
    return GameState(
        config=config,
        board=board,
        revealed_clues=[clue, blind_clue],
        played_clues={0: "clue-0", 2: "clue-1"},
    )


def test_possible_colors_reduced_by_non_blind_clue():
    state = build_state()
    knowledge = PlayerKnowledge(pseudo="alice")
    result = compute_possible_colors(state, knowledge)
    assert result[0] == sorted(["red", "blue"])


def test_possible_colors_unaffected_for_unlocked_card():
    state = build_state()
    knowledge = PlayerKnowledge(pseudo="alice")
    result = compute_possible_colors(state, knowledge)
    assert result[1] == sorted(state.config.colors)


def test_possible_colors_unaffected_by_blind_clue():
    state = build_state()
    knowledge = PlayerKnowledge(pseudo="alice")
    result = compute_possible_colors(state, knowledge)
    # carte verrouillée par un indice AVEUGLE : ne doit pas réduire les couleurs possibles
    assert result[2] == sorted(state.config.colors)


def test_forced_color_overrides_everything():
    state = build_state()
    knowledge = PlayerKnowledge(pseudo="alice")
    knowledge.notes[1] = PlayerNote(forced_color="green")
    result = compute_possible_colors(state, knowledge)
    assert result[1] == ["green"]
    # les autres cartes ne sont pas affectées par la déduction forcée sur la carte 1
    assert result[0] == sorted(["red", "blue"])
