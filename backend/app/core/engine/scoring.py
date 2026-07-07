from __future__ import annotations

from .board import is_connected, orthogonal_neighbors
from .models import GameResult, GameState
from .rules import check_objective

# Table officielle des paliers de score (regles.md), par nombre de joueurs. Pour un nombre de
# joueurs hors 2-4 (configuration personnalisée), on se cale sur le palier le plus proche —
# approximation raisonnable, ce n'est pas un jeu de compétition.
SCORE_TIERS: dict[int, list[tuple[int, str]]] = {
    2: [(7, "honorable"), (11, "glorieuse")],
    3: [(9, "honorable"), (15, "glorieuse")],
    4: [(10, "honorable"), (18, "glorieuse")],
}


def check_victory(state: GameState) -> GameResult:
    """Détermine victoire/défaite à partir des VRAIES couleurs, sans exception pour les indices
    aveugles (ceux-ci n'affectent que compute_score, jamais cette fonction).
    """
    reasons: list[str] = []
    revealed_board = {card.id: card.color for card in state.board.values()}

    positions_by_color: dict[str, set] = {}
    for card in state.board.values():
        positions_by_color.setdefault(card.color, set()).add(card.position)

    for color, positions in positions_by_color.items():
        if not is_connected(positions):
            reasons.append(f"color_{color}_disconnected")

    for affinity in state.affinity_cards:
        positions_a = positions_by_color.get(affinity.color_a, set())
        positions_b = positions_by_color.get(affinity.color_b, set())
        if not _has_adjacent_pair(positions_a, positions_b):
            reasons.append(f"affinity_{affinity.color_a}_{affinity.color_b}_not_met")

    if state.objective_card and not check_objective(state.board, state.objective_card.shape_name):
        reasons.append(f"objective_{state.objective_card.shape_name}_not_met")

    return GameResult(victory=not reasons, reasons=reasons, revealed_board=revealed_board)


def _has_adjacent_pair(positions_a: set, positions_b: set) -> bool:
    for pos in positions_a:
        if any(neighbor in positions_b for neighbor in orthogonal_neighbors(pos)):
            return True
    return False


def _tier_for_score(score: int, num_players: int) -> str:
    reference_players = min(max(num_players, 2), 4)
    tiers = SCORE_TIERS[reference_players]
    for threshold, name in tiers:
        if score <= threshold:
            return name
    return "legendaire"


def compute_score(state: GameState) -> tuple[int, str]:
    """Calcul du score post-victoire uniquement (n'affecte jamais check_victory).

    - indice bien placé : +1 (en mode indices aveugles, tout indice posé compte comme bien placé)
    - indice mal placé : -1
    - indice révélé non posé : +2
    - indice non révélé : +5
    """
    score = 0
    for clue in state.revealed_clues:
        if clue.played_on_card_id is not None:
            if state.config.blind_clues:
                score += 1
            else:
                card = state.board[clue.played_on_card_id]
                score += 1 if card.color in clue.colors else -1
        else:
            score += 2
    score += 5 * len(state.clue_pile)

    tier = _tier_for_score(score, len(state.players_order))
    return score, tier


def estimate_live_score(state: GameState) -> tuple[int, int, str, str]:
    """Fourchette de score affichable en cours de partie, calculée uniquement à partir
    d'informations publiques (nombre d'indices posés/non posés/restants) — jamais des
    vraies couleurs, qui doivent rester secrètes jusqu'à la fin de partie. Chaque indice
    déjà posé vaut -1 (pire cas) à +1 (meilleur cas), sauf en indices aveugles où il vaut
    toujours +1 (déterministe).
    """
    placed = [c for c in state.revealed_clues if c.played_on_card_id is not None]
    unplaced_count = len(state.revealed_clues) - len(placed)
    base = 2 * unplaced_count + 5 * len(state.clue_pile)

    if state.config.blind_clues:
        base += len(placed)
        low = high = base
    else:
        low, high = base - len(placed), base + len(placed)

    num_players = len(state.players_order)
    return low, high, _tier_for_score(low, num_players), _tier_for_score(high, num_players)
