"""Logros y medallas: definiciones y evaluación (sin dependencias de UI)."""

from __future__ import annotations

from dataclasses import dataclass

from englishboost import content
from englishboost.db import LEVELS, Database

TIERS = {
    "bronze": ("🥉", "Bronce", 25),
    "silver": ("🥈", "Plata", 50),
    "gold": ("🥇", "Oro", 100),
}


@dataclass(frozen=True)
class Achievement:
    id: str
    icon: str
    name: str
    description: str
    category: str
    tier: str
    stat: str  # clave de Database.achievement_stats()
    goal: int

    @property
    def xp_bonus(self) -> int:
        return TIERS[self.tier][2]

    @property
    def medal(self) -> str:
        return TIERS[self.tier][0]


def _level_medals() -> list[Achievement]:
    tiers = dict(zip(LEVELS, ["bronze", "silver", "gold"]))
    return [
        Achievement(
            f"medal-{lvl}", "🎖️", f"Medalla {lvl}",
            f"Completa todas las lecciones de {lvl} ({content.LEVEL_INFO[lvl][0]}).",
            "Medallas de nivel", tiers[lvl], f"done_{lvl}",
            len(content.lessons_for_level(lvl)),
        )
        for lvl in LEVELS
    ]


def all_achievements() -> list[Achievement]:
    total_lessons = len(content.all_lessons())
    A = Achievement
    return _level_medals() + [
        A("first-lesson", "🌱", "Primeros pasos", "Completa tu primera lección.",
          "Lecciones", "bronze", "lessons_done", 1),
        A("lessons-5", "📗", "Estudiante constante", "Completa 5 lecciones.",
          "Lecciones", "bronze", "lessons_done", 5),
        A("lessons-12", "📚", "Ratón de biblioteca", "Completa 12 lecciones.",
          "Lecciones", "silver", "lessons_done", 12),
        A("lessons-all", "🎓", "Graduado EnglishBoost", f"Completa las {total_lessons} lecciones.",
          "Lecciones", "gold", "lessons_done", total_lessons),
        A("perfect-1", "💯", "Sin errores", "Termina una lección con 100%.",
          "Precisión", "bronze", "perfect_lessons", 1),
        A("perfect-5", "🎯", "Francotirador", "Termina 5 lecciones con 100%.",
          "Precisión", "silver", "perfect_lessons", 5),
        A("perfect-15", "🧠", "Mente brillante", "Termina 15 lecciones con 100%.",
          "Precisión", "gold", "perfect_lessons", 15),
        A("streak-3", "🔥", "En racha", "Practica 3 días seguidos.",
          "Constancia", "bronze", "best_streak", 3),
        A("streak-7", "⚡", "Semana perfecta", "Practica 7 días seguidos.",
          "Constancia", "silver", "best_streak", 7),
        A("streak-30", "🏆", "Imparable", "Practica 30 días seguidos.",
          "Constancia", "gold", "best_streak", 30),
        A("xp-500", "⭐", "500 XP", "Acumula 500 puntos de experiencia.",
          "Experiencia", "bronze", "xp", 500),
        A("xp-2000", "🌟", "2,000 XP", "Acumula 2,000 puntos de experiencia.",
          "Experiencia", "silver", "xp", 2000),
        A("xp-5000", "💫", "5,000 XP", "Acumula 5,000 puntos de experiencia.",
          "Experiencia", "gold", "xp", 5000),
        A("vocab-25", "🃏", "Coleccionista", "Ten 25 palabras en tu mazo de repaso.",
          "Vocabulario", "bronze", "vocab_total", 25),
        A("cards-100", "🔁", "Memoria de elefante", "Acierta 100 tarjetas de repaso.",
          "Vocabulario", "silver", "cards_correct", 100),
        A("mastered-50", "🧩", "Vocabulario dominado", "Domina 50 palabras (repaso cada 21+ días).",
          "Vocabulario", "gold", "vocab_mastered", 50),
        A("interview-1", "💼", "Primera entrevista", "Practica una respuesta de entrevista.",
          "Profesional", "bronze", "interviews", 1),
        A("interview-10", "🤝", "Listo para el reclutador", "Practica 10 entrevistas.",
          "Profesional", "silver", "interviews", 10),
        A("writing-5", "✉️", "Pluma profesional", "Corrige 5 correos o mensajes.",
          "Profesional", "silver", "writings", 5),
        A("conversation-1", "💬", "Rompehielos", "Termina una conversación con la IA.",
          "Profesional", "bronze", "conversations", 1),
        A("conversation-10", "🗣️", "Conversador fluido", "Termina 10 conversaciones con la IA.",
          "Profesional", "gold", "conversations", 10),
        A("minutes-60", "⏱️", "Primera hora", "Estudia 60 minutos en total.",
          "Constancia", "bronze", "study_minutes", 60),
        A("minutes-600", "⌛", "Diez horas", "Estudia 600 minutos en total.",
          "Constancia", "gold", "study_minutes", 600),
    ]


def progress(achievement: Achievement, stats: dict[str, int]) -> tuple[int, int]:
    return min(stats.get(achievement.stat, 0), achievement.goal), achievement.goal


def check_new(db: Database) -> list[Achievement]:
    """Desbloquea los logros recién conseguidos y suma su XP extra.

    Repite la evaluación porque la XP de un logro puede desbloquear otro.
    """
    newly: list[Achievement] = []
    while True:
        stats = db.achievement_stats()
        unlocked = db.unlocked_achievements()
        batch = [a for a in all_achievements()
                 if a.id not in unlocked and stats.get(a.stat, 0) >= a.goal]
        if not batch:
            return newly
        for a in batch:
            db.unlock_achievement(a.id)
            db.add_xp(a.xp_bonus)
        newly.extend(batch)
