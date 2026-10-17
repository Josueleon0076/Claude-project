"""Repetición espaciada basada en SM-2 (el algoritmo clásico de SuperMemo/Anki)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

# Calidad de la respuesta (escala SM-2 de 0 a 5)
AGAIN, HARD, GOOD, EASY = 1, 3, 4, 5


@dataclass
class CardState:
    ease: float
    interval: int
    repetitions: int
    due: date


def schedule(ease: float, interval: int, reps: int, quality: int,
             today: date | None = None) -> CardState:
    """Calcula el siguiente repaso de una tarjeta según la calidad de la respuesta."""
    today = today or date.today()
    if quality < 3:
        # Fallo: la tarjeta vuelve mañana y se reinicia la secuencia.
        reps, interval = 0, 1
    else:
        reps += 1
        if reps == 1:
            interval = 1
        elif reps == 2:
            interval = 3
        else:
            interval = round(interval * ease)
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease = max(1.3, round(ease, 2))
    return CardState(ease, interval, reps, today + timedelta(days=interval))
