from __future__ import annotations

import random
import time

from pydantic import ValidationError

from . import board, clues, rules, scoring
from .enums import GamePhase, PlayerRole, TurnPhase
from .exceptions import (
    CardLockedError,
    CardNotFoundError,
    ClueNotFoundError,
    IllegalClueActionError,
    InvalidConfigError,
    NotEnoughPlayersError,
    NotYourTurnError,
    UnknownPlayerError,
    WrongGamePhaseError,
    WrongPhaseError,
)
from .models import (
    AffinityCard,
    GameConfig,
    GameState,
    HistoryAction,
    HistoryEntry,
    LastMove,
    ObjectiveCard,
    Observation,
    PlayerKnowledge,
    PlayerNote,
    Position,
)


class GameEngine:
    """State machine pure et synchrone du jeu Yōkai.

    Aucune dépendance réseau/asyncio ici : les timers et la diffusion des messages (y compris les
    révélations éphémères d'observation) sont gérés par une couche supérieure.
    """

    def __init__(self, config: GameConfig | None = None, rng: random.Random | None = None):
        self.rng: random.Random = rng if rng is not None else random.Random()
        self.state: GameState = GameState(config=config or GameConfig())

    # ------------------------------------------------------------------
    # Gestion des joueurs / salle d'attente
    # ------------------------------------------------------------------

    def register_player(self, pseudo: str) -> PlayerRole:
        state = self.state
        if pseudo in state.players:
            return state.players[pseudo].role

        if state.phase == GamePhase.WAITING_ROOM:
            state.players_order.append(pseudo)
            state.players[pseudo] = PlayerKnowledge(
                pseudo=pseudo, seat_index=len(state.players_order) - 1
            )
            return PlayerRole.PLAYER

        state.players[pseudo] = PlayerKnowledge(pseudo=pseudo, role=PlayerRole.SPECTATOR)
        return PlayerRole.SPECTATOR

    def remove_waiting_player(self, pseudo: str) -> None:
        state = self.state
        if pseudo in state.players_order:
            state.players_order.remove(pseudo)
        state.players.pop(pseudo, None)
        for index, remaining_pseudo in enumerate(state.players_order):
            state.players[remaining_pseudo].seat_index = index

    def kick_player(self, requester_pseudo: str, target_pseudo: str) -> None:
        state = self.state
        if state.phase != GamePhase.WAITING_ROOM:
            raise WrongGamePhaseError("un joueur ne peut être exclu que dans la salle d'attente")
        if target_pseudo == requester_pseudo:
            raise InvalidConfigError("impossible de s'exclure soi-même")
        if target_pseudo not in state.players_order:
            raise UnknownPlayerError(f"joueur inconnu : {target_pseudo}")
        self.remove_waiting_player(target_pseudo)

    def update_config(self, partial: dict) -> None:
        state = self.state
        if state.phase != GamePhase.WAITING_ROOM:
            raise WrongGamePhaseError(
                "la configuration ne peut être modifiée que dans la salle d'attente"
            )
        merged = {**state.config.model_dump(), **partial}
        try:
            state.config = GameConfig(**merged)
        except ValidationError as exc:
            raise InvalidConfigError(str(exc)) from exc

    # ------------------------------------------------------------------
    # Cycle de partie
    # ------------------------------------------------------------------

    def start_game(self) -> None:
        state = self.state
        if state.phase != GamePhase.WAITING_ROOM:
            raise WrongGamePhaseError("la partie a déjà démarré")
        if len(state.players_order) < 2:
            raise NotEnoughPlayersError("il faut au moins 2 joueurs pour démarrer")

        state.board = board.generate_initial_layout(state.config, self.rng)
        state.clue_pile = clues.generate_clue_deck(
            state.config.colors, state.config.clue_counts, self.rng
        )
        state.revealed_clues = []
        state.played_clues = {}

        num_affinity = min(state.config.num_affinity_cards, len(state.players_order))
        chosen_holders = self.rng.sample(state.players_order, num_affinity)
        affinity_cards: list[AffinityCard] = []
        for holder_pseudo in chosen_holders:
            color_a, color_b = self.rng.sample(state.config.colors, 2)
            affinity_cards.append(
                AffinityCard(color_a=color_a, color_b=color_b, holder_pseudo=holder_pseudo)
            )
        state.affinity_cards = affinity_cards

        state.objective_card = (
            ObjectiveCard(
                shape_name=rules.resolve_objective_shape(state.config.objective_shape, self.rng)
            )
            if state.config.objective_shape
            else None
        )

        state.current_player_index = self.rng.randrange(len(state.players_order))
        state.current_turn_phase = TurnPhase.OBSERVE
        state.observations_this_turn = 0
        state.turn_number = 1
        state.phase = GamePhase.IN_PROGRESS
        state.result = None
        state.history = []
        state.next_history_seq = 0
        state.last_move = None

        now = time.time()
        state.game_deadline = (
            now + state.config.game_timer_seconds if state.config.game_timer_seconds else None
        )
        state.turn_deadline = (
            now + state.config.turn_timer_seconds if state.config.turn_timer_seconds else None
        )

        # Les positions initiales ne révèlent aucune couleur (elle reste privée) : elles peuvent
        # être exposées à tous sans restriction, et servent de point de départ pour reconstruire
        # côté client l'évolution du plateau au fil de l'historique (rejeu "en avant" des `move`
        # suivants, voir core/realtime/views.py qui expose ces entrées telles quelles).
        initial_positions = {
            str(card_id): {"row": card.position.row, "col": card.position.col}
            for card_id, card in state.board.items()
        }
        self._add_history("system", "start_game", {"positions": initial_positions})

    def back_to_waiting_room(self) -> None:
        state = self.state
        if state.phase != GamePhase.FINISHED:
            raise WrongGamePhaseError("la partie n'est pas terminée")

        state.phase = GamePhase.WAITING_ROOM
        state.board = {}
        state.clue_pile = []
        state.revealed_clues = []
        state.played_clues = {}
        state.affinity_cards = []
        state.objective_card = None
        state.result = None
        state.history = []
        state.next_history_seq = 0
        state.turn_number = 0
        state.current_player_index = 0
        state.current_turn_phase = TurnPhase.OBSERVE
        state.observations_this_turn = 0
        state.turn_deadline = None
        state.game_deadline = None
        state.last_move = None

        for knowledge in state.players.values():
            knowledge.notes = {}
            knowledge.observations = {}

    # ------------------------------------------------------------------
    # Actions de tour
    # ------------------------------------------------------------------

    def handle_observe(self, pseudo: str, card_id: int) -> str:
        state = self._check_turn(pseudo, TurnPhase.OBSERVE)
        if state.observations_this_turn >= 2:
            raise WrongPhaseError("deux observations ont déjà été faites ce tour")

        card = state.board.get(card_id)
        if card is None:
            raise CardNotFoundError(f"carte {card_id} introuvable")
        if card.is_locked:
            raise CardLockedError(f"la carte {card_id} est verrouillée")

        state.players[pseudo].observations[card_id] = Observation(
            card_id=card_id, color=card.color, turn_number=state.turn_number
        )
        if pseudo not in card.observed_by:
            card.observed_by.append(pseudo)
        state.observations_this_turn += 1
        self._add_history(pseudo, "observe", {"card_id": card_id})

        remaining_unlocked = any(not c.is_locked for c in state.board.values())
        if state.observations_this_turn >= 2 or not remaining_unlocked:
            state.current_turn_phase = TurnPhase.MOVE

        return card.color

    def handle_skip_observe(self, pseudo: str) -> None:
        state = self._check_turn(pseudo, TurnPhase.OBSERVE)
        if any(not c.is_locked for c in state.board.values()):
            raise IllegalClueActionError("il reste des cartes à observer")
        state.current_turn_phase = TurnPhase.MOVE

    def handle_move(self, pseudo: str, card_id: int, to: Position) -> None:
        state = self._check_turn(pseudo, TurnPhase.MOVE)
        origin = state.board[card_id].position
        board.validate_move(state.board, card_id, to)
        board.apply_move(state.board, card_id, to)
        state.last_move = LastMove(card_id=card_id, origin=origin)
        self._add_history(
            pseudo,
            "move",
            {
                "card_id": card_id,
                "from": {"row": origin.row, "col": origin.col},
                "to": {"row": to.row, "col": to.col},
            },
        )
        state.current_turn_phase = TurnPhase.CLUE

    def handle_skip_move(self, pseudo: str) -> None:
        state = self._check_turn(pseudo, TurnPhase.MOVE)
        if board.has_legal_move(state.board):
            raise IllegalClueActionError("un déplacement légal existe encore")
        state.current_turn_phase = TurnPhase.CLUE

    def handle_undo_move(self, pseudo: str) -> None:
        state = self._check_turn(pseudo, TurnPhase.CLUE)
        if state.last_move is None:
            raise WrongPhaseError("aucun déplacement à annuler")

        last_move = state.last_move
        state.board[last_move.card_id].position = last_move.origin
        if state.config.history_enabled and state.history and state.history[-1].action == "move":
            state.history.pop()
        state.last_move = None
        state.current_turn_phase = TurnPhase.MOVE

    def handle_reveal_clue(self, pseudo: str) -> None:
        state = self._check_turn(pseudo, TurnPhase.CLUE)
        if not state.clue_pile:
            raise ClueNotFoundError("la pioche d'indices est vide")

        clue = state.clue_pile.pop(0)
        clue.revealed = True
        clue.blind = state.config.blind_clues
        clue.order_revealed = len(state.revealed_clues)
        state.revealed_clues.append(clue)

        self._add_history(pseudo, "reveal_clue", {"clue_id": clue.id})
        self._end_turn_segment()

    def handle_place_clue(self, pseudo: str, clue_id: str, card_id: int) -> None:
        state = self._check_turn(pseudo, TurnPhase.CLUE)

        clue = next((c for c in state.revealed_clues if c.id == clue_id), None)
        if clue is None or clue.played_on_card_id is not None:
            raise ClueNotFoundError(f"indice {clue_id} introuvable ou déjà posé")

        if state.config.stack_clues:
            unplayed = [c for c in state.revealed_clues if c.played_on_card_id is None]
            max_order = max(c.order_revealed for c in unplayed)
            if clue.order_revealed != max_order:
                raise IllegalClueActionError(
                    "en mode pile, seul le dernier indice révélé peut être posé"
                )

        card = state.board.get(card_id)
        if card is None:
            raise CardNotFoundError(f"carte {card_id} introuvable")
        if card.is_locked:
            raise CardLockedError(f"la carte {card_id} est déjà verrouillée")

        card.is_locked = True
        card.locked_by_clue_id = clue_id
        card.locked_face_down = clue.blind
        clue.played_on_card_id = card_id
        state.played_clues[card_id] = clue_id

        self._add_history(pseudo, "place_clue", {"clue_id": clue_id, "card_id": card_id})

        no_clue_left_anywhere = len(state.clue_pile) == 0 and all(
            c.played_on_card_id is not None for c in state.revealed_clues
        )
        if no_clue_left_anywhere:
            self.end_game(reason="clues_exhausted")
        else:
            self._end_turn_segment()

    def handle_skip_clue(self, pseudo: str) -> None:
        state = self._check_turn(pseudo, TurnPhase.CLUE)

        if state.clue_pile:
            raise IllegalClueActionError("il reste des indices à révéler")

        unplayed_clue_exists = any(c.played_on_card_id is None for c in state.revealed_clues)
        unlocked_card_exists = any(not c.is_locked for c in state.board.values())
        if unplayed_clue_exists and unlocked_card_exists:
            raise IllegalClueActionError("un indice révélé peut encore être posé")

        self._end_turn_segment()

    def handle_declare_end(self, pseudo: str) -> None:
        state = self.state
        if state.phase != GamePhase.IN_PROGRESS:
            raise WrongGamePhaseError("la partie n'est pas en cours")
        if state.current_turn_phase != TurnPhase.OBSERVE or state.observations_this_turn != 0:
            raise WrongPhaseError("la fin de partie ne peut être déclarée qu'en tout début de tour")

        self.end_game(reason="declared")

    def force_advance_turn(self, reason: str = "timeout") -> None:
        self._add_history(self.state.current_player or "system", "turn_timeout", {"reason": reason})
        self._end_turn_segment()

    def end_game(self, reason: str = "manual") -> None:
        state = self.state
        state.phase = GamePhase.FINISHED
        state.result = scoring.check_victory(state)
        if state.result.victory:
            score, tier = scoring.compute_score(state)
            state.result.score = score
            state.result.score_tier = tier

        self._add_history(
            state.current_player or "system",
            "game_end",
            {"reason": reason, "victory": state.result.victory},
        )

    # ------------------------------------------------------------------
    # Notes / déductions privées (hors tour)
    # ------------------------------------------------------------------

    def set_note(self, pseudo: str, card_id: int, text: str) -> None:
        knowledge = self._require_player(pseudo)
        self._require_card(card_id)
        knowledge.notes.setdefault(card_id, PlayerNote()).text = text

    def set_deduction(self, pseudo: str, card_id: int, forced_color: str | None) -> None:
        knowledge = self._require_player(pseudo)
        self._require_card(card_id)
        if forced_color is not None and forced_color not in self.state.config.colors:
            raise InvalidConfigError(f"couleur inconnue : {forced_color}")
        knowledge.notes.setdefault(card_id, PlayerNote()).forced_color = forced_color

    # ------------------------------------------------------------------
    # Aides privées
    # ------------------------------------------------------------------

    def _require_player(self, pseudo: str) -> PlayerKnowledge:
        knowledge = self.state.players.get(pseudo)
        if knowledge is None:
            raise UnknownPlayerError(f"joueur inconnu : {pseudo}")
        return knowledge

    def _require_card(self, card_id: int) -> None:
        if card_id not in self.state.board:
            raise CardNotFoundError(f"carte {card_id} introuvable")

    def _check_turn(self, pseudo: str, expected_phase: TurnPhase) -> GameState:
        state = self.state
        if state.phase != GamePhase.IN_PROGRESS:
            raise WrongGamePhaseError("la partie n'est pas en cours")
        if pseudo != state.current_player:
            raise NotYourTurnError(f"ce n'est pas le tour de {pseudo}")
        if state.current_turn_phase != expected_phase:
            raise WrongPhaseError(
                f"action impossible en phase {state.current_turn_phase}, attendu {expected_phase}"
            )
        return state

    def _end_turn_segment(self) -> None:
        state = self.state
        state.current_player_index = (state.current_player_index + 1) % len(state.players_order)
        state.turn_number += 1
        state.observations_this_turn = 0
        state.current_turn_phase = TurnPhase.OBSERVE
        state.last_move = None
        state.turn_deadline = (
            time.time() + state.config.turn_timer_seconds
            if state.config.turn_timer_seconds
            else None
        )

    def _add_history(self, actor: str, action: HistoryAction, details: dict | None = None) -> None:
        state = self.state
        if not state.config.history_enabled:
            return
        state.history.append(
            HistoryEntry(
                seq=state.next_history_seq,
                turn_number=state.turn_number,
                actor=actor,
                action=action,
                details=details or {},
            )
        )
        state.next_history_seq += 1
