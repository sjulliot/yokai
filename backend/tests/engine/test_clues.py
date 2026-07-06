from __future__ import annotations

import random

from app.core.engine import clues


def test_default_clue_counts_matches_official_table_4_colors_4_cards():
    assert clues.default_clue_counts(4, 4, 2) == {1: 2, 2: 3, 3: 2}
    assert clues.default_clue_counts(4, 4, 3) == {1: 2, 2: 4, 3: 3}
    assert clues.default_clue_counts(4, 4, 4) == {1: 3, 2: 4, 3: 3}


def test_default_clue_counts_custom_config_does_not_crash():
    counts = clues.default_clue_counts(3, 4, 3)
    assert isinstance(counts, dict)
    assert all(size in (1, 2, 3) for size in counts)
    assert all(count >= 0 for count in counts.values())


def test_generate_clue_deck_total_matches_counts():
    colors = ["red", "blue", "green", "yellow"]
    counts = {1: 2, 2: 3, 3: 2}
    deck = clues.generate_clue_deck(colors, counts, random.Random(42))
    assert len(deck) == sum(counts.values())


def test_generate_clue_deck_respects_combo_sizes():
    colors = ["red", "blue", "green", "yellow"]
    counts = {1: 2, 2: 3, 3: 2}
    deck = clues.generate_clue_deck(colors, counts, random.Random(42))
    sizes_present = {len(card.colors) for card in deck}
    assert sizes_present <= {1, 2, 3}
    # every clue's colors must be a subset of the configured colors
    for card in deck:
        assert set(card.colors) <= set(colors)


def test_generate_clue_deck_custom_3_colors_does_not_crash():
    colors = ["red", "blue", "green"]
    counts = clues.default_clue_counts(3, 4, 3)
    deck = clues.generate_clue_deck(colors, counts, random.Random(42))
    assert len(deck) == sum(counts.values())
