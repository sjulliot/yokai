from __future__ import annotations

import random

import pytest

from app.core.engine import board as board_mod
from app.core.engine.engine import GameEngine
from app.core.engine.enums import GamePhase, PlayerRole, TurnPhase
from app.core.engine.exceptions import (
    CardNotFoundError,
    ClueNotFoundError,
    GameError,
    InvalidConfigError,
    NotEnoughPlayersError,
    NotYourTurnError,
    UnknownPlayerError,
    WrongGamePhaseError,
    WrongPhaseError,
)
from app.core.engine.models import GameConfig, Position


def make_two_player_config(**overrides) -> GameConfig:
    defaults = dict(colors=["red", "blue"], cards_per_color=2, clue_counts={1: 1, 2: 1})
    defaults.update(overrides)
    return GameConfig(**defaults)


def start_two_player_game(config: GameConfig | None = None) -> GameEngine:
    engine = GameEngine(config=config or make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    engine.register_player("bob")
    engine.start_game()
    return engine


def other_player(engine: GameEngine, pseudo: str) -> str:
    """Le premier joueur est randomisé (voir GameEngine.start_game) : les tests de
    l'enchaînement des tours ne peuvent pas supposer que c'est toujours "alice"."""
    return next(p for p in engine.state.players_order if p != pseudo)


def find_legal_move(board: dict) -> tuple[int, Position] | None:
    """Cherche un déplacement légal en réutilisant les règles de board.py."""
    occupied = {c.position for c in board.values()}
    for card_id, card in board.items():
        if card.is_locked:
            continue
        for other in board.values():
            for neighbor in board_mod.orthogonal_neighbors(other.position):
                if neighbor in occupied:
                    continue
                try:
                    board_mod.validate_move(board, card_id, neighbor)
                except GameError:
                    continue
                return card_id, neighbor
    return None


def play_move_or_skip(engine: GameEngine, pseudo: str) -> None:
    found = find_legal_move(engine.state.board)
    if found is None:
        engine.handle_skip_move(pseudo)
    else:
        card_id, target = found
        engine.handle_move(pseudo, card_id, target)


# ------------------------------------------------------------------
# Cycle complet de tour
# ------------------------------------------------------------------


def test_full_turn_cycle_observe_move_clue_advances_to_next_player():
    engine = start_two_player_game()
    state = engine.state
    first, second = state.current_player, other_player(engine, state.current_player)
    assert state.current_turn_phase == TurnPhase.OBSERVE

    card_ids = list(state.board.keys())
    color0 = engine.handle_observe(first, card_ids[0])
    assert color0 == state.board[card_ids[0]].color
    assert state.current_turn_phase == TurnPhase.OBSERVE
    assert state.observations_this_turn == 1

    color1 = engine.handle_observe(first, card_ids[1])
    assert color1 == state.board[card_ids[1]].color
    assert state.current_turn_phase == TurnPhase.MOVE
    assert state.observations_this_turn == 2

    play_move_or_skip(engine, first)
    assert state.current_turn_phase == TurnPhase.CLUE

    engine.handle_reveal_clue(first)

    assert state.current_player == second
    assert state.turn_number == 2
    assert state.current_turn_phase == TurnPhase.OBSERVE
    assert state.observations_this_turn == 0


def test_not_your_turn_error_when_wrong_player_acts():
    engine = start_two_player_game()
    second = other_player(engine, engine.state.current_player)
    card_id = next(iter(engine.state.board))
    with pytest.raises(NotYourTurnError):
        engine.handle_observe(second, card_id)


def test_wrong_phase_error_when_moving_before_observing():
    engine = start_two_player_game()
    first = engine.state.current_player
    with pytest.raises(WrongPhaseError):
        engine.handle_move(first, 0, Position(row=0, col=0))


def test_declare_end_only_allowed_at_very_start_of_turn():
    engine = start_two_player_game()
    first = engine.state.current_player
    card_id = next(iter(engine.state.board))
    engine.handle_observe(first, card_id)  # observations_this_turn devient 1
    with pytest.raises(WrongPhaseError):
        engine.handle_declare_end(first)


def test_declare_end_allowed_before_any_action_and_ends_game():
    engine = start_two_player_game()
    engine.handle_declare_end(engine.state.current_player)
    assert engine.state.phase == GamePhase.FINISHED
    assert engine.state.result is not None


def test_declare_end_allowed_by_any_player():
    engine = start_two_player_game()
    second = other_player(engine, engine.state.current_player)
    engine.handle_declare_end(second)
    assert engine.state.phase == GamePhase.FINISHED
    assert engine.state.result is not None


def test_start_game_with_less_than_two_players_raises():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    with pytest.raises(NotEnoughPlayersError):
        engine.start_game()


def test_update_config_refused_while_game_in_progress():
    engine = start_two_player_game()
    with pytest.raises(WrongGamePhaseError):
        engine.update_config({"cards_per_color": 3})


def test_game_ends_automatically_when_last_clue_is_placed():
    # deck d'un seul indice : une fois révélé puis posé, plus rien nulle part -> fin auto.
    config = make_two_player_config(clue_counts={1: 1})
    engine = start_two_player_game(config)
    state = engine.state

    def play_full_turn(pseudo: str, place_last_clue: bool) -> None:
        card_ids = list(state.board.keys())
        engine.handle_observe(pseudo, card_ids[0])
        engine.handle_observe(pseudo, card_ids[1])
        play_move_or_skip(engine, pseudo)
        if place_last_clue:
            clue_id = state.revealed_clues[0].id
            target_card = next(c.id for c in state.board.values() if not c.is_locked)
            engine.handle_place_clue(pseudo, clue_id, target_card)
        else:
            engine.handle_reveal_clue(pseudo)

    assert len(state.clue_pile) == 1
    play_full_turn("alice", place_last_clue=False)  # alice révèle l'unique indice
    assert len(state.clue_pile) == 0
    assert len(state.revealed_clues) == 1
    assert state.phase == GamePhase.IN_PROGRESS
    assert state.current_player == "bob"

    play_full_turn("bob", place_last_clue=True)  # bob pose le dernier indice restant

    assert state.phase == GamePhase.FINISHED
    assert state.result is not None
    assert state.history[-1].action == "game_end"
    assert state.history[-1].details["reason"] == "clues_exhausted"


# ------------------------------------------------------------------
# Salle d'attente / joueurs
# ------------------------------------------------------------------


def test_register_player_in_waiting_room_becomes_player():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    role = engine.register_player("alice")
    assert role == PlayerRole.PLAYER
    assert engine.state.players_order == ["alice"]


def test_register_player_after_start_becomes_spectator():
    engine = start_two_player_game()
    role = engine.register_player("charlie")
    assert role == PlayerRole.SPECTATOR
    assert "charlie" not in engine.state.players_order


def test_register_player_reconnection_keeps_existing_role():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    role = engine.register_player("alice")
    assert role == PlayerRole.PLAYER
    assert engine.state.players_order == ["alice"]


def test_kick_player_removes_target_from_waiting_room():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    engine.register_player("bob")

    engine.kick_player("alice", "bob")

    assert engine.state.players_order == ["alice"]
    assert "bob" not in engine.state.players


def test_kick_player_cannot_kick_self():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    with pytest.raises(InvalidConfigError):
        engine.kick_player("alice", "alice")


def test_kick_player_unknown_target_raises():
    engine = GameEngine(config=make_two_player_config(), rng=random.Random(42))
    engine.register_player("alice")
    with pytest.raises(UnknownPlayerError):
        engine.kick_player("alice", "ghost")


def test_kick_player_after_start_raises():
    engine = start_two_player_game()
    first = engine.state.current_player
    second = other_player(engine, first)
    with pytest.raises(WrongGamePhaseError):
        engine.kick_player(first, second)


# ------------------------------------------------------------------
# Notes / déductions
# ------------------------------------------------------------------


def test_set_note_unknown_player_raises():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    with pytest.raises(UnknownPlayerError):
        engine.set_note("ghost", card_id, "suspect rouge")


def test_set_note_unknown_card_raises():
    engine = start_two_player_game()
    with pytest.raises(CardNotFoundError):
        engine.set_note("alice", 9999, "note")


def test_set_deduction_invalid_color_raises():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    with pytest.raises(InvalidConfigError):
        engine.set_deduction("alice", card_id, "purple")


def test_set_deduction_exclusion_invalid_color_raises():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    with pytest.raises(InvalidConfigError):
        engine.set_deduction_exclusion("alice", card_id, ["purple"])


def test_set_deduction_exclusion_stores_multiple_colors():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    engine.set_deduction_exclusion("alice", card_id, ["red", "blue"])
    note = engine.state.players["alice"].notes[card_id]
    assert note.excluded_colors == ["blue", "red"]


def test_forcing_a_color_clears_its_exclusions():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    engine.set_deduction_exclusion("alice", card_id, ["red"])
    engine.set_deduction("alice", card_id, "red")
    note = engine.state.players["alice"].notes[card_id]
    assert note.forced_color == "red"
    assert note.excluded_colors == []


def test_excluding_the_forced_color_clears_it():
    engine = start_two_player_game()
    card_id = next(iter(engine.state.board))
    engine.set_deduction("alice", card_id, "red")
    engine.set_deduction_exclusion("alice", card_id, ["red"])
    note = engine.state.players["alice"].notes[card_id]
    assert note.forced_color is None
    assert note.excluded_colors == ["red"]


def test_handle_reveal_clue_empty_pile_raises_clue_not_found():
    config = make_two_player_config(clue_counts={1: 0, 2: 0})
    engine = start_two_player_game(config)
    state = engine.state
    first = state.current_player
    card_ids = list(state.board.keys())
    engine.handle_observe(first, card_ids[0])
    engine.handle_observe(first, card_ids[1])
    play_move_or_skip(engine, first)
    with pytest.raises(ClueNotFoundError):
        engine.handle_reveal_clue(first)


# ------------------------------------------------------------------
# Qui a observé quelle carte (observed_by)
# ------------------------------------------------------------------


def test_handle_observe_records_observer_without_revealing_color():
    engine = start_two_player_game()
    state = engine.state
    first = state.current_player
    card_id = next(iter(state.board))

    engine.handle_observe(first, card_id)

    assert state.board[card_id].observed_by == [first]


def test_handle_observe_twice_by_same_player_does_not_duplicate():
    engine = start_two_player_game()
    state = engine.state
    first = state.current_player
    card_id = next(iter(state.board))

    engine.handle_observe(first, card_id)
    engine.handle_observe(first, card_id)

    assert state.board[card_id].observed_by == [first]


def test_reobserving_known_card_does_not_consume_turn_budget():
    """En mode mémoire parfaite (par défaut), une carte déjà observée un tour précédent reste
    affichée en permanence : la re-consulter est gratuite et ne doit pas compter dans le
    quota de 2 observations du tour."""
    engine = start_two_player_game()
    state = engine.state
    first, second = state.current_player, other_player(engine, state.current_player)
    card_ids = list(state.board.keys())
    known = card_ids[0]

    engine.handle_observe(first, known)
    engine.handle_observe(first, card_ids[1])
    play_move_or_skip(engine, first)
    engine.handle_reveal_clue(first)  # termine le tour d'alice
    assert state.current_player == second

    engine.handle_observe(second, card_ids[2])
    engine.handle_observe(second, card_ids[3])
    play_move_or_skip(engine, second)
    engine.handle_reveal_clue(second)  # termine le tour de bob, on revient à alice
    assert state.current_player == first
    assert state.observations_this_turn == 0

    color = engine.handle_observe(first, known)
    assert color == state.board[known].color
    assert state.observations_this_turn == 0  # ne compte pas comme une observation

    # card_ids[2]/[3] : déjà observées par bob, mais pas encore par alice -> comptent bien.
    engine.handle_observe(first, card_ids[2])
    engine.handle_observe(first, card_ids[3])
    assert state.observations_this_turn == 2
    assert state.current_turn_phase == TurnPhase.MOVE


def test_reobserving_known_card_without_perfect_memory_still_counts():
    engine = start_two_player_game(config=make_two_player_config(perfect_memory=False))
    state = engine.state
    first = state.current_player
    card_id = next(iter(state.board))

    engine.handle_observe(first, card_id)
    engine.handle_observe(first, card_id)

    assert state.observations_this_turn == 2
    assert state.current_turn_phase == TurnPhase.MOVE


def test_handle_observe_logs_history_entry_without_color():
    engine = start_two_player_game()
    state = engine.state
    first = state.current_player
    card_id = next(iter(state.board))

    engine.handle_observe(first, card_id)

    entry = state.history[-1]
    assert entry.action == "observe"
    assert entry.actor == first
    assert entry.details == {"card_id": card_id}


def test_handle_observe_accumulates_multiple_observers():
    engine = start_two_player_game()
    state = engine.state
    first, second = state.current_player, other_player(engine, state.current_player)
    card_ids = list(state.board.keys())
    target = card_ids[0]

    engine.handle_observe(first, target)
    engine.handle_observe(first, card_ids[1])
    play_move_or_skip(engine, first)
    engine.handle_reveal_clue(first)  # termine le tour du premier joueur
    assert state.current_player == second

    engine.handle_observe(second, target)

    assert state.board[target].observed_by == [first, second]


# ------------------------------------------------------------------
# Annulation du dernier déplacement
# ------------------------------------------------------------------


def advance_to_move_phase(engine: GameEngine, pseudo: str) -> None:
    card_ids = list(engine.state.board.keys())
    engine.handle_observe(pseudo, card_ids[0])
    engine.handle_observe(pseudo, card_ids[1])


def test_undo_move_restores_position_and_reopens_move_phase():
    engine = start_two_player_game()
    state = engine.state
    first = state.current_player
    advance_to_move_phase(engine, first)

    found = find_legal_move(state.board)
    assert found is not None
    card_id, target = found
    origin = state.board[card_id].position

    engine.handle_move(first, card_id, target)
    assert state.board[card_id].position == target
    assert state.current_turn_phase == TurnPhase.CLUE

    engine.handle_undo_move(first)

    assert state.board[card_id].position == origin
    assert state.current_turn_phase == TurnPhase.MOVE
    assert state.last_move is None
    assert state.history[-1].action != "move"


def test_undo_move_before_any_move_raises_wrong_phase():
    engine = start_two_player_game()
    with pytest.raises(WrongPhaseError):
        engine.handle_undo_move(engine.state.current_player)


def test_undo_move_after_clue_action_is_out_of_window():
    engine = start_two_player_game()
    state = engine.state
    first, second = state.current_player, other_player(engine, state.current_player)
    advance_to_move_phase(engine, first)
    found = find_legal_move(state.board)
    assert found is not None
    card_id, target = found
    engine.handle_move(first, card_id, target)
    engine.handle_reveal_clue(first)  # termine le tour du premier joueur

    assert state.current_player == second
    with pytest.raises(NotYourTurnError):
        engine.handle_undo_move(first)


def test_undo_move_works_even_when_history_disabled():
    config = make_two_player_config(history_enabled=False)
    engine = start_two_player_game(config)
    state = engine.state
    first = state.current_player
    assert state.history == []
    advance_to_move_phase(engine, first)
    found = find_legal_move(state.board)
    assert found is not None
    card_id, target = found
    origin = state.board[card_id].position

    engine.handle_move(first, card_id, target)
    engine.handle_undo_move(first)

    assert state.board[card_id].position == origin
    assert state.current_turn_phase == TurnPhase.MOVE
    assert state.history == []
