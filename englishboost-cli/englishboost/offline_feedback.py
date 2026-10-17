"""Feedback offline (heurístico) para respuestas de entrevista y correos.

Se usa cuando no hay conexión con Claude. No reemplaza a un tutor, pero detecta
los errores más frecuentes de hispanohablantes en contextos profesionales.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

SPANISH_HINTS = {"pero", "porque", "que", "también", "entonces", "trabajo", "equipo", "y", "el", "la", "los"}
IRREGULAR_PAST = {
    "led", "built", "made", "took", "wrote", "found", "gave", "went", "did", "had",
    "was", "were", "began", "chose", "brought", "taught", "thought", "spent", "sent", "won",
}
FILLERS = {"um", "uh", "basically", "stuff"}


@dataclass
class Feedback:
    score: int
    good: list[str] = field(default_factory=list)
    improve: list[str] = field(default_factory=list)


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-zÀ-ÿ']+", text)


def evaluate_answer(question: dict, answer: str) -> Feedback:
    words = _words(answer)
    lower = [w.lower() for w in words]
    n = len(words)
    fb = Feedback(score=5)
    is_star = "STAR" in question.get("category", "")

    if n < 25:
        fb.score -= 2
        fb.improve.append(f"Tu respuesta es muy corta ({n} palabras). Apunta a 60-150 palabras para dar contexto y resultados.")
    elif n > 220:
        fb.score -= 1
        fb.improve.append(f"Es bastante larga ({n} palabras). En entrevistas, sé conciso: 1-2 minutos por respuesta.")
    else:
        fb.score += 1
        fb.good.append(f"Buena longitud ({n} palabras).")

    hits = [k for k in question.get("keywords", []) if k.lower() in answer.lower()]
    if len(hits) >= 2:
        fb.score += 1
        fb.good.append("Incluyes ideas clave esperadas para esta pregunta.")
    else:
        fb.improve.append("Revisa el consejo de la pregunta: faltan ideas clave que el entrevistador espera escuchar.")

    if re.search(r"\d", answer):
        fb.score += 1
        fb.good.append("Usas números/datos concretos. ¡Eso da credibilidad!")
    elif is_star:
        fb.improve.append("Añade un resultado medible: 'reduced costs by 20%', 'saved 5 hours a week'.")

    past = [w for w in lower if w.endswith("ed") or w in IRREGULAR_PAST]
    if is_star:
        if len(past) >= 3:
            fb.score += 1
            fb.good.append("Narras en pasado simple, como pide una historia STAR.")
        else:
            fb.improve.append("Las historias STAR se cuentan en pasado simple: 'I led', 'I built', 'we reduced'.")
        if lower.count("we") > lower.count("i"):
            fb.improve.append("Usas más 'we' que 'I'. El entrevistador quiere saber qué hiciste TÚ.")

    if re.search(r"(^|\s)i(\s|')", answer):
        fb.score -= 1
        fb.improve.append("El pronombre 'I' (yo) siempre va en mayúscula, incluso en medio de la oración.")

    spanish = SPANISH_HINTS.intersection(lower)
    if len(spanish) >= 2:
        fb.score -= 1
        fb.improve.append("Parece que mezclaste palabras en español. Intenta mantenerte en inglés aunque sea con frases simples.")

    fillers = FILLERS.intersection(lower)
    if fillers:
        fb.improve.append(f"Evita muletillas o palabras vagas: {', '.join(sorted(fillers))}.")

    fb.score = max(1, min(10, fb.score))
    return fb


def evaluate_email(text: str) -> Feedback:
    lower = text.lower()
    words = _words(text)
    fb = Feedback(score=6)

    if re.match(r"\s*(hi|hello|dear|good (morning|afternoon))\b", lower):
        fb.good.append("Abres con un saludo adecuado.")
    else:
        fb.score -= 1
        fb.improve.append("Empieza con un saludo: 'Hi Sarah,' o 'Dear Mr. Smith,' (formal).")

    if re.search(r"(best regards|kind regards|best,|thanks|thank you|sincerely|cheers)", lower):
        fb.good.append("Cierras de forma profesional.")
    else:
        fb.score -= 1
        fb.improve.append("Añade un cierre: 'Best regards,' / 'Thanks,' + tu nombre.")

    if re.search(r"(could you|would you|please|i was wondering)", lower):
        fb.score += 1
        fb.good.append("Usas fórmulas corteses (please / could you).")
    elif re.search(r"(^|[.!?,]\s+)(send|give|tell|do|make|fix)\b", lower, re.MULTILINE):
        fb.score -= 1
        fb.improve.append("Hay imperativos directos ('Send me...'). Suaviza con 'Could you please send me...?'.")

    if "actually" in lower:
        fb.improve.append("Ojo con 'actually': significa 'en realidad', no 'actualmente' (= 'currently').")
    if re.search(r"(^|\s)i(\s|')", text):
        fb.score -= 1
        fb.improve.append("El pronombre 'I' siempre va en mayúscula.")
    if "!!" in text or re.search(r"\b[A-Z]{5,}\b", text):
        fb.score -= 1
        fb.improve.append("Evita '!!' y las MAYÚSCULAS: en inglés se perciben como gritar.")
    if len(words) > 200:
        fb.improve.append("El mensaje es largo. Los correos efectivos van al grano: 3-5 frases si es posible.")
    if re.search(r"\b(wanna|gonna|u|pls|thx)\b", lower):
        fb.score -= 1
        fb.improve.append("Evita abreviaturas informales (gonna, pls, thx, u) en mensajes profesionales.")

    fb.score = max(1, min(10, fb.score))
    return fb
