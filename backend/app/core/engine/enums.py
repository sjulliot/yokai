from enum import StrEnum


class GamePhase(StrEnum):
    WAITING_ROOM = "waiting_room"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class TurnPhase(StrEnum):
    OBSERVE = "observe"
    MOVE = "move"
    CLUE = "clue"


class PlayerRole(StrEnum):
    PLAYER = "player"
    SPECTATOR = "spectator"
