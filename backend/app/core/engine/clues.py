from __future__ import annotations

import itertools
import random

from .models import ClueCard, ClueSize

# Table officielle (regles.md) : nombre d'indices par taille de combinaison, pour le cas standard
# 4 couleurs x 4 cartes. Sert de référence par défaut, toujours éditable par les joueurs.
OFFICIAL_CLUE_TABLE: dict[int, dict[ClueSize, int]] = {
    2: {1: 2, 2: 3, 3: 2},
    3: {1: 2, 2: 4, 3: 3},
    4: {1: 3, 2: 4, 3: 3},
}


def default_clue_counts(
    num_colors: int, cards_per_color: int, num_players: int
) -> dict[ClueSize, int]:
    """Compteurs d'indices par défaut à proposer dans la waiting room.

    Reproduit la table officielle pour le cas standard (4 couleurs, 2 à 4 joueurs). Pour toute
    configuration personnalisée (nombre de couleurs/joueurs différent), extrapole proportionnellement
    au nombre total de cartes plateau à partir du ratio officiel le plus proche — ce n'est pas un
    jeu de compétition, une approximation raisonnable suffit et reste éditable dans tous les cas.
    """
    total_cards = num_colors * cards_per_color
    reference_players = min(max(num_players, 2), 4)
    base_table = OFFICIAL_CLUE_TABLE[reference_players]

    if num_colors == 4 and cards_per_color == 4:
        return dict(base_table)

    ratio = total_cards / 16  # 16 = cartes plateau du cas standard
    max_combo = min(3, num_colors)

    scaled = {
        size: max(0, round(count * ratio))
        for size, count in base_table.items()
        if size <= max_combo
    }
    # Ne jamais retomber à zéro indice si la table officielle en proposait — au moins 1 par taille
    # disponible dans le jeu de base.
    for size, count in base_table.items():
        if size <= max_combo and count > 0:
            scaled[size] = max(scaled[size], 1)
    return scaled


def generate_clue_deck(
    colors: list[str], clue_counts: dict[ClueSize, int], rng: random.Random
) -> list[ClueCard]:
    """Construit le deck d'indices à partir de compteurs explicites {taille: nombre}.

    Pour chaque taille de combinaison demandée, tire uniformément parmi toutes les combinaisons de
    couleurs possibles de cette taille (avec remise entre tailles différentes, sans répétition de la
    même combinaison exacte au sein d'une même taille tant que le pool n'est pas épuisé).
    """
    deck: list[ClueCard] = []
    next_id = 0
    for size, count in clue_counts.items():
        if count <= 0:
            continue
        combos = list(itertools.combinations(colors, size))
        if not combos:
            continue
        pool = list(combos)
        rng.shuffle(pool)
        for i in range(count):
            combo = pool[i % len(pool)]
            deck.append(ClueCard(id=f"clue-{next_id}", colors=list(combo)))
            next_id += 1

    rng.shuffle(deck)
    return deck
