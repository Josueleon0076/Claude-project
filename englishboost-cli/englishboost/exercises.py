"""Motor de ejercicios: normalización y corrección de respuestas (sin dependencias de UI)."""

from __future__ import annotations

import random
import re
from dataclasses import dataclass
from difflib import SequenceMatcher

CONTRACTIONS = {
    "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
    "he's": "he is", "she's": "she is", "it's": "it is", "that's": "that is",
    "there's": "there is", "what's": "what is", "let's": "let us",
    "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
    "i'll": "i will", "you'll": "you will", "we'll": "we will", "they'll": "they will",
    "he'll": "he will", "she'll": "she will", "it'll": "it will",
    "i'd": "i would", "you'd": "you would", "we'd": "we would", "they'd": "they would",
    "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
    "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
    "won't": "will not", "wouldn't": "would not", "can't": "cannot", "couldn't": "could not",
    "shouldn't": "should not",
}

TYPO_THRESHOLD = 0.9


def normalize(text: str) -> str:
    """Minúsculas, sin puntuación final y con contracciones expandidas."""
    text = text.lower().strip().replace("’", "'").replace("`", "'")
    text = re.sub(r"[.,!?;:\"()¡¿]", " ", text)
    words = [CONTRACTIONS.get(w, w) for w in text.split()]
    return " ".join(" ".join(words).split())


@dataclass
class Result:
    correct: bool
    expected: str
    typo: bool = False  # correcto, pero con un pequeño error de escritura


def expected_answers(ex: dict) -> list[str]:
    if ex["type"] in ("mcq", "reading"):
        return [ex["options"][ex["answer"]]]
    if ex["type"] == "reorder":
        return [ex["answer"]]
    return list(ex["answers"])


def check(ex: dict, raw: str) -> Result:
    expected = expected_answers(ex)
    if ex["type"] in ("mcq", "reading"):
        raw = raw.strip()
        if raw.isdigit():
            ok = int(raw) - 1 == ex["answer"]
        else:
            ok = normalize(raw) == normalize(expected[0])
        return Result(ok, expected[0])

    given = normalize(raw)
    targets = [normalize(e) for e in expected]
    if given in targets:
        return Result(True, expected[0])
    # Tolerancia a errores de tipeo solo en respuestas largas (no en una palabra
    # como 'is' vs 'it', donde una letra cambia la gramática).
    best = max(SequenceMatcher(None, given, t).ratio() for t in targets)
    if best >= TYPO_THRESHOLD and len(given) > 12:
        return Result(True, expected[0], typo=True)
    return Result(False, expected[0])


def shuffled_words(ex: dict, rng: random.Random | None = None) -> list[str]:
    rng = rng or random.Random()
    words = list(ex["words"])
    original = list(words)
    for _ in range(5):
        rng.shuffle(words)
        if words != original and " ".join(words) != ex["answer"]:
            break
    return words


def score_to_xp(correct: int, total: int) -> int:
    """10 XP por acierto + bono por sesión perfecta."""
    xp = correct * 10
    if total and correct == total:
        xp += 20
    return xp
