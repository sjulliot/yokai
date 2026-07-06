class GameError(Exception):
    """Base class for all game rule violations. Carries a machine-readable code."""

    code = "GAME_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotYourTurnError(GameError):
    code = "NOT_YOUR_TURN"


class WrongPhaseError(GameError):
    code = "WRONG_PHASE"


class WrongGamePhaseError(GameError):
    code = "WRONG_GAME_PHASE"


class IllegalMoveError(GameError):
    code = "ILLEGAL_MOVE"


class CardLockedError(GameError):
    code = "CARD_LOCKED"


class CardNotFoundError(GameError):
    code = "CARD_NOT_FOUND"


class ClueNotFoundError(GameError):
    code = "CLUE_NOT_FOUND"


class IllegalClueActionError(GameError):
    code = "ILLEGAL_CLUE_ACTION"


class InvalidConfigError(GameError):
    code = "INVALID_CONFIG"


class UnknownPlayerError(GameError):
    code = "UNKNOWN_PLAYER"


class NotEnoughPlayersError(GameError):
    code = "NOT_ENOUGH_PLAYERS"
