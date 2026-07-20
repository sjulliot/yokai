from __future__ import annotations

from app.core.engine.enums import GamePhase, PlayerRole
from app.core.engine.models import (
    ClueCard,
    GameConfig,
    GameState,
    Observation,
    PlayerKnowledge,
    Position,
    YokaiCard,
)
from app.core.realtime.views import build_player_view

COLORS = ["red", "blue", "green", "yellow"]

# Positions arbitraires, non pertinentes pour ces tests de filtrage anti-triche.
POSITIONS = {i: Position(row=0, col=i) for i in range(1, 7)}

# Couleurs réelles connues des tests (jamais censées fuiter sauf autorisation explicite).
REAL_COLORS = {
    1: "red",  # verrouillée par indice à 1 couleur -> known_color public
    2: "blue",  # verrouillée par indice à 2 couleurs -> possible_colors seulement
    3: "green",  # observée par alice
    4: "yellow",  # observée par bob
    5: "red",  # verrouillée par indice aveugle
    6: "blue",  # carte libre, aucune information
}


def build_state(perfect_memory: bool) -> GameState:
    board = {
        card_id: YokaiCard(id=card_id, color=color, position=POSITIONS[card_id])
        for card_id, color in REAL_COLORS.items()
    }

    clue_single = ClueCard(
        id="clue1", colors=["red"], revealed=True, order_revealed=0, played_on_card_id=1
    )
    clue_double = ClueCard(
        id="clue2", colors=["blue", "green"], revealed=True, order_revealed=1, played_on_card_id=2
    )
    clue_blind = ClueCard(
        id="clue3",
        colors=["yellow"],
        revealed=True,
        blind=True,
        order_revealed=2,
        played_on_card_id=5,
    )

    board[1].is_locked = True
    board[1].locked_by_clue_id = "clue1"
    board[2].is_locked = True
    board[2].locked_by_clue_id = "clue2"
    board[5].is_locked = True
    board[5].locked_by_clue_id = "clue3"
    board[5].locked_face_down = True

    alice = PlayerKnowledge(
        pseudo="alice",
        seat_index=0,
        role=PlayerRole.PLAYER,
        observations={3: Observation(card_id=3, color="green", turn_number=1)},
    )
    bob = PlayerKnowledge(
        pseudo="bob",
        seat_index=1,
        role=PlayerRole.PLAYER,
        observations={4: Observation(card_id=4, color="yellow", turn_number=1)},
    )

    return GameState(
        phase=GamePhase.IN_PROGRESS,
        config=GameConfig(colors=COLORS, perfect_memory=perfect_memory),
        board=board,
        revealed_clues=[clue_single, clue_double, clue_blind],
        played_clues={1: "clue1", 2: "clue2", 5: "clue3"},
        players={"alice": alice, "bob": bob},
        players_order=["alice", "bob"],
        current_player_index=0,
    )


def real_colors_leaked(view: dict, allowed_known: set[int] = frozenset()) -> set[int]:
    """Retourne l'ensemble des card_id dont known_color expose la vraie couleur alors que ce
    n'était pas dans les card_id autorisés — aide à répéter l'assertion anti-triche partout.
    """
    leaked = set()
    for card in view["cards"]:
        card_id = card["id"]
        if card_id not in allowed_known and card["known_color"] == REAL_COLORS[card_id]:
            leaked.add(card_id)
    return leaked


def card_map(view: dict) -> dict[int, dict]:
    return {card["id"]: card for card in view["cards"]}


# ------------------------------------------------------------------
# Indices publics : known_color et possible_colors
# ------------------------------------------------------------------


def test_single_color_clue_locks_known_color_for_everyone():
    state = build_state(perfect_memory=False)
    for pseudo, role in (("alice", PlayerRole.PLAYER), ("bob", PlayerRole.PLAYER)):
        view = build_player_view(state, pseudo, role, None, {"alice", "bob"})
        cards = card_map(view)
        assert cards[1]["known_color"] == "red"
        assert cards[1]["possible_colors"] == []


def test_multi_color_clue_never_reveals_known_color_but_restricts_possible():
    state = build_state(perfect_memory=False)
    for pseudo in ("alice", "bob"):
        view = build_player_view(state, pseudo, PlayerRole.PLAYER, None, {"alice", "bob"})
        card2 = card_map(view)[2]
        assert card2["known_color"] is None
        assert card2["possible_colors"] == ["blue", "green"]
        # La vraie couleur ne doit jamais fuiter, y compris via possible_colors mal calculé.
        assert card2["known_color"] != REAL_COLORS[2] or card2["known_color"] is None


# ------------------------------------------------------------------
# Observations privées / perfect_memory
# ------------------------------------------------------------------


def test_perfect_memory_reveals_own_observation_only_to_observer():
    state = build_state(perfect_memory=True)

    alice_view = build_player_view(state, "alice", PlayerRole.PLAYER, None, {"alice", "bob"})
    bob_view = build_player_view(state, "bob", PlayerRole.PLAYER, None, {"alice", "bob"})

    # Alice a observé la carte 3 : elle seule doit la voir en known_color.
    assert card_map(alice_view)[3]["known_color"] == "green"
    assert card_map(bob_view)[3]["known_color"] is None

    # Bob a observé la carte 4 : lui seul doit la voir en known_color.
    assert card_map(bob_view)[4]["known_color"] == "yellow"
    assert card_map(alice_view)[4]["known_color"] is None

    assert real_colors_leaked(alice_view, allowed_known={1, 3}) == set()
    assert real_colors_leaked(bob_view, allowed_known={1, 4}) == set()


def test_own_observation_survives_a_later_multi_color_clue_lock():
    """Régression : une carte personnellement observée (perfect_memory) ne doit jamais
    redevenir "inconnue" pour son observateur quand un indice à 2-3 couleurs est ensuite
    posé dessus — l'indice public est une information en MOINS précise, jamais en plus.
    """
    state = build_state(perfect_memory=True)
    # Carte 2 : verrouillée par un indice à 2 couleurs (blue/green), vraie couleur "blue".
    state.players["alice"].observations[2] = Observation(card_id=2, color="blue", turn_number=1)

    alice_view = build_player_view(state, "alice", PlayerRole.PLAYER, None, {"alice", "bob"})
    bob_view = build_player_view(state, "bob", PlayerRole.PLAYER, None, {"alice", "bob"})

    assert card_map(alice_view)[2]["known_color"] == "blue"
    # Bob, lui, n'a pas observé cette carte : il ne doit voir que l'info publique de l'indice.
    assert card_map(bob_view)[2]["known_color"] is None
    assert card_map(bob_view)[2]["possible_colors"] == ["blue", "green"]


def test_without_perfect_memory_observation_never_appears_as_known_color():
    state = build_state(perfect_memory=False)

    alice_view = build_player_view(state, "alice", PlayerRole.PLAYER, None, {"alice", "bob"})
    bob_view = build_player_view(state, "bob", PlayerRole.PLAYER, None, {"alice", "bob"})

    # Même l'observateur lui-même ne doit JAMAIS voir sa propre observation comme known_color
    # quand perfect_memory est désactivé (seul le message éphémère observation_result la révèle,
    # hors scope de views.py).
    assert card_map(alice_view)[3]["known_color"] is None
    assert card_map(bob_view)[4]["known_color"] is None

    assert real_colors_leaked(alice_view, allowed_known={1}) == set()
    assert real_colors_leaked(bob_view, allowed_known={1}) == set()


# ------------------------------------------------------------------
# Indices aveugles
# ------------------------------------------------------------------


def test_blind_clue_hides_colors_from_players_but_not_omniscient_spectator():
    state = build_state(perfect_memory=False)

    alice_view = build_player_view(state, "alice", PlayerRole.PLAYER, None, {"alice", "bob"})
    blind_clue_alice = next(c for c in alice_view["revealed_clues"] if c["id"] == "clue3")
    assert blind_clue_alice["colors"] is None

    # La carte verrouillée à l'aveugle ne doit jamais révéler sa vraie couleur à un joueur normal.
    assert card_map(alice_view)[5]["known_color"] is None

    omniscient_view = build_player_view(state, "carol", PlayerRole.SPECTATOR, None, set())
    blind_clue_omniscient = next(c for c in omniscient_view["revealed_clues"] if c["id"] == "clue3")
    assert blind_clue_omniscient["colors"] == ["yellow"]


# ------------------------------------------------------------------
# Spectateurs : omniscient vs viewing_as
# ------------------------------------------------------------------


def test_omniscient_spectator_sees_all_real_colors():
    state = build_state(perfect_memory=False)
    view = build_player_view(state, "carol", PlayerRole.SPECTATOR, None, {"alice", "bob"})
    cards = card_map(view)
    for card_id, real_color in REAL_COLORS.items():
        assert cards[card_id]["known_color"] == real_color
    assert view["is_my_turn"] is False


def test_spectator_viewing_as_mirrors_target_player_view():
    state = build_state(perfect_memory=True)

    alice_view = build_player_view(state, "alice", PlayerRole.PLAYER, None, {"alice", "bob"})
    spectator_view = build_player_view(
        state, "carol", PlayerRole.SPECTATOR, "alice", {"alice", "bob"}
    )

    assert spectator_view["cards"] == alice_view["cards"]
    assert spectator_view["revealed_clues"] == alice_view["revealed_clues"]
    assert spectator_view["my_notes"] == alice_view["my_notes"]
    assert spectator_view["viewing_as"] == "alice"

    # Un spectateur n'est jamais "à son tour", même en empruntant la vue d'un joueur dont c'est
    # effectivement le tour.
    assert alice_view["is_my_turn"] is True
    assert spectator_view["is_my_turn"] is False

    # La carte 3 (observation privée d'alice, perfect_memory=True) doit rester visible dans la
    # vue empruntée, mais la vraie couleur ne doit toujours fuiter pour personne d'autre.
    assert card_map(spectator_view)[3]["known_color"] == "green"


# ------------------------------------------------------------------
# Fin de partie : toutes les couleurs sont révélées
# ------------------------------------------------------------------


def test_finished_phase_reveals_true_color_to_everyone():
    state = build_state(perfect_memory=False)
    state.phase = GamePhase.FINISHED

    for pseudo in ("alice", "bob"):
        view = build_player_view(state, pseudo, PlayerRole.PLAYER, None, {"alice", "bob"})
        cards = card_map(view)
        for card_id, real_color in REAL_COLORS.items():
            assert cards[card_id]["known_color"] == real_color
