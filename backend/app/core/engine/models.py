from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .enums import GamePhase, PlayerRole, TurnPhase

ClueSize = Literal[1, 2, 3]

HistoryAction = Literal[
    "start_game",
    "observe",
    "move",
    "reveal_clue",
    "place_clue",
    "declare_end",
    "turn_timeout",
    "game_timeout",
    "game_end",
]


class Position(BaseModel):
    model_config = {"frozen": True}

    row: int
    col: int

    def __add__(self, other: "Position") -> "Position":
        return Position(row=self.row + other.row, col=self.col + other.col)


ORTHOGONAL_OFFSETS = (
    Position(row=1, col=0),
    Position(row=-1, col=0),
    Position(row=0, col=1),
    Position(row=0, col=-1),
)


class GameConfig(BaseModel):
    colors: list[str] = Field(default_factory=lambda: ["red", "blue", "green", "yellow"])
    cards_per_color: int = 4
    perfect_memory: bool = True
    turn_timer_seconds: int | None = None
    game_timer_seconds: int | None = None
    history_enabled: bool = True

    # Pioche d'indices : compteurs indépendants par taille de combinaison (1, 2 ou 3 couleurs).
    # Toujours explicite : les défauts sont calculés par clues.default_clue_counts() et injectés
    # côté waiting room, jamais devinés silencieusement ici.
    clue_counts: dict[ClueSize, int] = Field(default_factory=lambda: {1: 2, 2: 3, 3: 2})

    # Options de règles indépendantes (pas de "niveau" cumulatif).
    stack_clues: bool = False
    blind_clues: bool = False
    num_affinity_cards: int = 0
    objective_shape: str | None = None

    @property
    def total_cards(self) -> int:
        return len(self.colors) * self.cards_per_color

    @field_validator("colors")
    @classmethod
    def validate_colors(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("il faut au moins 2 couleurs")
        if len(set(v)) != len(v):
            raise ValueError("les couleurs doivent être uniques")
        return v

    @field_validator("cards_per_color")
    @classmethod
    def validate_cards_per_color(cls, v: int) -> int:
        if v < 2:
            raise ValueError("il faut au moins 2 cartes par couleur")
        return v

    @field_validator("clue_counts")
    @classmethod
    def validate_clue_counts(cls, v: dict[int, int]) -> dict[int, int]:
        for size, count in v.items():
            if size not in (1, 2, 3):
                raise ValueError("les indices ne portent que 1, 2 ou 3 couleurs")
            if count < 0:
                raise ValueError("un compteur d'indices ne peut pas être négatif")
        return v

    @model_validator(mode="after")
    def validate_totals(self) -> "GameConfig":
        if self.total_cards > 60:
            raise ValueError("grille trop grande (max 60 cartes)")
        max_combo = min(3, len(self.colors))
        for size in self.clue_counts:
            if size > max_combo:
                raise ValueError(
                    f"impossible de générer des indices à {size} couleurs avec "
                    f"seulement {len(self.colors)} couleur(s) en jeu"
                )
        return self


class YokaiCard(BaseModel):
    id: int
    color: str
    position: Position
    is_locked: bool = False
    locked_by_clue_id: str | None = None
    locked_face_down: bool = False  # True si verrouillé via un indice aveugle
    observed_by: list[str] = Field(
        default_factory=list
    )  # pseudos ayant observé cette carte (jamais la couleur)


class ClueCard(BaseModel):
    id: str
    colors: list[str]  # 1 à 3 couleurs possibles
    revealed: bool = False
    blind: bool = False  # révélée "à l'aveugle" (indices aveugles) : jamais montrée aux joueurs
    order_revealed: int | None = None
    played_on_card_id: int | None = None


class Observation(BaseModel):
    card_id: int
    color: str
    turn_number: int


class PlayerNote(BaseModel):
    text: str = ""
    forced_color: str | None = None


class PlayerKnowledge(BaseModel):
    pseudo: str
    seat_index: int | None = None
    role: PlayerRole = PlayerRole.PLAYER
    connected: bool = True
    # Historique complet des observations, conservé pour l'historique/debug — NE PAS utiliser
    # directement pour l'affichage "couleur connue" quand perfect_memory est désactivé : seule la
    # dernière observation du tour EN COURS doit être montrée (voir engine.get_ephemeral_reveal).
    observations: dict[int, Observation] = Field(default_factory=dict)
    notes: dict[int, PlayerNote] = Field(default_factory=dict)


class AffinityCard(BaseModel):
    color_a: str
    color_b: str
    holder_pseudo: str


class ObjectiveCard(BaseModel):
    shape_name: str


class HistoryEntry(BaseModel):
    seq: int
    turn_number: int
    actor: str
    action: HistoryAction
    details: dict = Field(default_factory=dict)


class LastMove(BaseModel):
    """Coup déplacement du tour en cours, annulable tant qu'aucune action indice n'a suivi.

    Indépendant de `GameState.history` (qui peut être désactivé via `history_enabled`) :
    c'est la seule source fiable pour restaurer la position d'origine lors d'un undo.
    """

    card_id: int
    origin: Position


class GameResult(BaseModel):
    victory: bool
    reasons: list[str] = Field(default_factory=list)
    revealed_board: dict[int, str] = Field(default_factory=dict)
    score: int | None = None
    score_tier: str | None = None  # "honorable" | "glorieuse" | "legendaire"


class GameState(BaseModel):
    phase: GamePhase = GamePhase.WAITING_ROOM
    config: GameConfig = Field(default_factory=GameConfig)

    board: dict[int, YokaiCard] = Field(default_factory=dict)

    clue_pile: list[ClueCard] = Field(default_factory=list)  # non révélées, ordre = pioche
    revealed_clues: list[ClueCard] = Field(default_factory=list)  # révélées, non posées
    played_clues: dict[int, str] = Field(default_factory=dict)  # card_id -> clue_id

    players: dict[str, PlayerKnowledge] = Field(default_factory=dict)
    players_order: list[str] = Field(default_factory=list)
    current_player_index: int = 0
    current_turn_phase: TurnPhase = TurnPhase.OBSERVE
    observations_this_turn: int = 0
    turn_number: int = 0
    last_move: LastMove | None = None

    affinity_cards: list[AffinityCard] = Field(default_factory=list)
    objective_card: ObjectiveCard | None = None

    turn_deadline: float | None = None
    game_deadline: float | None = None

    result: GameResult | None = None
    history: list[HistoryEntry] = Field(default_factory=list)
    next_history_seq: int = 0

    @property
    def current_player(self) -> str | None:
        if not self.players_order:
            return None
        return self.players_order[self.current_player_index]
