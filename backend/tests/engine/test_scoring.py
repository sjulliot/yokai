from __future__ import annotations

from app.core.engine import scoring
from app.core.engine.models import (
    AffinityCard,
    ClueCard,
    GameConfig,
    GameState,
    ObjectiveCard,
    Position,
    YokaiCard,
)


def test_check_victory_true_when_colors_grouped_no_extra_rules():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    board = {
        0: YokaiCard(id=0, color="red", position=Position(row=0, col=0)),
        1: YokaiCard(id=1, color="red", position=Position(row=0, col=1)),
        2: YokaiCard(id=2, color="blue", position=Position(row=1, col=0)),
        3: YokaiCard(id=3, color="blue", position=Position(row=1, col=1)),
    }
    state = GameState(config=config, board=board, players_order=["a", "b"])
    result = scoring.check_victory(state)
    assert result.victory is True
    assert result.reasons == []


def test_check_victory_false_when_colors_not_grouped():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    board = {
        0: YokaiCard(id=0, color="red", position=Position(row=0, col=0)),
        1: YokaiCard(id=1, color="blue", position=Position(row=0, col=1)),
        2: YokaiCard(id=2, color="blue", position=Position(row=1, col=0)),
        3: YokaiCard(id=3, color="red", position=Position(row=1, col=1)),
    }
    state = GameState(config=config, board=board, players_order=["a", "b"])
    result = scoring.check_victory(state)
    assert result.victory is False
    assert any("disconnected" in reason for reason in result.reasons)


def test_check_victory_false_when_affinity_not_met():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    # chaque couleur est bien groupée individuellement, mais les deux groupes ne se touchent pas
    board = {
        0: YokaiCard(id=0, color="red", position=Position(row=0, col=0)),
        1: YokaiCard(id=1, color="red", position=Position(row=0, col=1)),
        2: YokaiCard(id=2, color="blue", position=Position(row=5, col=5)),
        3: YokaiCard(id=3, color="blue", position=Position(row=5, col=6)),
    }
    affinity = AffinityCard(color_a="red", color_b="blue", holder_pseudo="a")
    state = GameState(
        config=config, board=board, players_order=["a", "b"], affinity_cards=[affinity]
    )
    result = scoring.check_victory(state)
    assert result.victory is False
    assert any("affinity" in reason for reason in result.reasons)


def test_check_victory_false_when_objective_not_met():
    config = GameConfig(
        colors=["red", "blue"], cards_per_color=2, objective_shape="line", clue_counts={1: 1, 2: 1}
    )
    # grille 2x2 pleine : pas une ligne
    board = {
        0: YokaiCard(id=0, color="red", position=Position(row=0, col=0)),
        1: YokaiCard(id=1, color="red", position=Position(row=0, col=1)),
        2: YokaiCard(id=2, color="blue", position=Position(row=1, col=0)),
        3: YokaiCard(id=3, color="blue", position=Position(row=1, col=1)),
    }
    state = GameState(
        config=config,
        board=board,
        players_order=["a", "b"],
        objective_card=ObjectiveCard(shape_name="line"),
    )
    result = scoring.check_victory(state)
    assert result.victory is False
    assert any("objective" in reason for reason in result.reasons)


def test_check_victory_true_when_objective_met():
    config = GameConfig(
        colors=["red", "blue"], cards_per_color=2, objective_shape="line", clue_counts={1: 1, 2: 1}
    )
    board = {
        0: YokaiCard(id=0, color="red", position=Position(row=0, col=0)),
        1: YokaiCard(id=1, color="red", position=Position(row=0, col=1)),
        2: YokaiCard(id=2, color="blue", position=Position(row=0, col=2)),
        3: YokaiCard(id=3, color="blue", position=Position(row=0, col=3)),
    }
    state = GameState(
        config=config,
        board=board,
        players_order=["a", "b"],
        objective_card=ObjectiveCard(shape_name="line"),
    )
    result = scoring.check_victory(state)
    assert result.victory is True


def test_compute_score_correct_and_incorrect_clue_placement():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    board = {
        0: YokaiCard(
            id=0,
            color="red",
            position=Position(row=0, col=0),
            is_locked=True,
            locked_by_clue_id="clue-0",
        ),
        1: YokaiCard(
            id=1,
            color="blue",
            position=Position(row=0, col=1),
            is_locked=True,
            locked_by_clue_id="clue-1",
        ),
    }
    correct_clue = ClueCard(
        id="clue-0", colors=["red"], revealed=True, order_revealed=0, played_on_card_id=0
    )
    wrong_clue = ClueCard(
        id="clue-1", colors=["red"], revealed=True, order_revealed=1, played_on_card_id=1
    )
    state = GameState(
        config=config,
        board=board,
        revealed_clues=[correct_clue, wrong_clue],
        played_clues={0: "clue-0", 1: "clue-1"},
        players_order=["a", "b"],
    )
    score, _ = scoring.compute_score(state)
    assert score == 0  # +1 (bien placé) - 1 (mal placé)


def test_compute_score_revealed_not_played_gives_plus_two():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    clue = ClueCard(id="clue-0", colors=["red"], revealed=True, order_revealed=0)
    state = GameState(config=config, board={}, revealed_clues=[clue], players_order=["a", "b"])
    score, _ = scoring.compute_score(state)
    assert score == 2


def test_compute_score_unrevealed_gives_plus_five_each():
    config = GameConfig(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    pile = [ClueCard(id="clue-0", colors=["red"]), ClueCard(id="clue-1", colors=["blue"])]
    state = GameState(config=config, board={}, clue_pile=pile, players_order=["a", "b"])
    score, _ = scoring.compute_score(state)
    assert score == 10


def test_compute_score_blind_clue_always_plus_one_regardless_of_real_color():
    config = GameConfig(
        colors=["red", "blue"], cards_per_color=2, blind_clues=True, clue_counts={1: 1, 2: 1}
    )
    # carte rouge verrouillée à l'aveugle par un indice "blue" : le score l'ignore (toujours +1)
    board = {
        0: YokaiCard(
            id=0,
            color="red",
            position=Position(row=0, col=0),
            is_locked=True,
            locked_by_clue_id="clue-0",
            locked_face_down=True,
        ),
    }
    clue = ClueCard(
        id="clue-0",
        colors=["blue"],
        revealed=True,
        blind=True,
        order_revealed=0,
        played_on_card_id=0,
    )
    state = GameState(
        config=config,
        board=board,
        revealed_clues=[clue],
        played_clues={0: "clue-0"},
        players_order=["a", "b"],
    )
    score, _ = scoring.compute_score(state)
    assert score == 1


def test_blind_clues_never_bypass_victory_check_on_real_color_grouping():
    """Une carte mal verrouillée en mode blind_clues peut quand même faire perdre la partie
    si le regroupement final par couleur est incorrect : blind_clues n'affecte QUE le score,
    jamais check_victory."""
    config = GameConfig(
        colors=["red", "blue"], cards_per_color=2, blind_clues=True, clue_counts={1: 1, 2: 1}
    )
    board = {
        0: YokaiCard(
            id=0,
            color="red",
            position=Position(row=0, col=0),
            is_locked=True,
            locked_by_clue_id="clue-0",
            locked_face_down=True,
        ),
        1: YokaiCard(id=1, color="red", position=Position(row=1, col=1)),  # non adjacent à 0
        2: YokaiCard(id=2, color="blue", position=Position(row=0, col=1)),
        3: YokaiCard(id=3, color="blue", position=Position(row=1, col=0)),
    }
    clue = ClueCard(
        id="clue-0",
        colors=["blue"],
        revealed=True,
        blind=True,
        order_revealed=0,
        played_on_card_id=0,
    )
    state = GameState(
        config=config,
        board=board,
        revealed_clues=[clue],
        played_clues={0: "clue-0"},
        players_order=["a", "b"],
    )
    result = scoring.check_victory(state)
    assert result.victory is False
    assert any("red_disconnected" in reason for reason in result.reasons)
