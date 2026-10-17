"""Carga del contenido offline (lecciones y banco de preguntas de entrevista)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from englishboost.db import LEVELS

DATA_DIR = Path(__file__).parent / "data"

LEVEL_INFO = {
    "A1-A2": ("Fundamentos", "Vocabulario base y oraciones en presente, pasado y futuro."),
    "B1": ("Fluidez operacional", "Tiempos perfectos, condicionales, phrasal verbs y lectura."),
    "B2-C1": ("Inglés profesional / remoto", "Reuniones, correos, entrevistas y tono profesional."),
}


@lru_cache(maxsize=1)
def all_lessons() -> list[dict]:
    lessons: list[dict] = []
    for path in sorted((DATA_DIR / "lessons").glob("*.json")):
        lessons.extend(json.loads(path.read_text(encoding="utf-8")))
    return sorted(lessons, key=lambda l: (LEVELS.index(l["level"]), l["id"]))


def lessons_for_level(level: str) -> list[dict]:
    return [l for l in all_lessons() if l["level"] == level]


def get_lesson(lesson_id: str) -> dict | None:
    return next((l for l in all_lessons() if l["id"] == lesson_id), None)


@lru_cache(maxsize=1)
def interview_questions() -> list[dict]:
    return json.loads((DATA_DIR / "interview.json").read_text(encoding="utf-8"))
