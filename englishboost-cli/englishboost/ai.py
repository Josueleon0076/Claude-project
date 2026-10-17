"""Integración opcional con la API de Claude (Anthropic).

Si el paquete `anthropic` no está instalado, no hay credenciales o no hay conexión,
la app sigue funcionando en modo offline con el contenido local.
"""

from __future__ import annotations

import os
from typing import Callable

try:
    import anthropic
except ImportError:  # la app funciona sin el SDK
    anthropic = None

DEFAULT_MODEL = "claude-opus-5-5"
FALLBACK_BETA = "server-side-fallback-2026-07-01"

TUTOR_PERSONA = (
    "You are EnglishBoost, a warm, encouraging ESL tutor for Spanish-speaking "
    "professionals who want to work remotely for international companies. "
    "Explanations and feedback are written in clear, friendly Spanish; English "
    "examples and corrected versions stay in English. Be concise: the learner "
    "studies in short 5-10 minute sessions in a terminal, so prefer short "
    "paragraphs and simple bullet lists over long essays, and avoid Markdown tables."
)

INTERVIEW_FEEDBACK_PROMPT = TUTOR_PERSONA + """

The learner is practicing a job interview answer in English. Evaluate it for a \
remote tech role and reply in this structure:
1. Puntuación: X/10 (one line).
2. Lo que hiciste bien (1-3 bullets).
3. Errores de gramática o vocabulario: quote each mistake, give the correction, \
and explain the rule in one short sentence in Spanish.
4. Estructura STAR / contenido: what is missing (numbers, the learner's own \
actions, a clear result), only if the question calls for STAR.
5. Versión mejorada: a natural, interview-ready rewrite in English that keeps \
the learner's facts (do not invent achievements; use [brackets] where a detail \
or number is missing)."""

WRITING_FEEDBACK_PROMPT = TUTOR_PERSONA + """

The learner wrote a professional {kind} in English. Review grammar, vocabulary \
and tone for an international workplace and reply with:
1. Tono: one line on how it sounds (too direct, too informal, good, etc.).
2. Correcciones: each mistake quoted, corrected, with a one-sentence rule in Spanish.
3. Versión corregida: the full improved {kind} in English, keeping the \
learner's intent and facts.
4. Frases útiles: 2-3 reusable expressions for this kind of message."""

MISTAKE_PROMPT = TUTOR_PERSONA + """

The learner made a mistake in an exercise. In at most 6 short lines of Spanish, \
explain why their answer is wrong (or, if it is actually also correct English, \
say so honestly), state the rule, and give two new English example sentences."""

CONVERSATION_PROMPT = TUTOR_PERSONA + """

You are role-playing this scenario with the learner: {scenario}
Learner's level: {level}.
Rules for every turn:
- Stay in character and reply in English with 1-3 sentences adapted to the \
learner's level, ending with a question or prompt that keeps the conversation going.
- If the learner's last message had mistakes, add a final line starting with \
"💡 Corrección:" that quotes the mistake, gives the fix, and explains it in a few \
words of Spanish. If there were no mistakes, omit that line.
- Start the conversation yourself when the learner says "START"."""

INTERVIEWER_PROMPT = TUTOR_PERSONA + """

You are a friendly but professional interviewer at an international tech \
company hiring for this remote role: {role}. Learner's level: {level}.
Ask ONE interview question at a time (mix behavioral STAR questions, remote-work \
questions and short technical questions appropriate to the role). After each \
answer: first give brief feedback in Spanish (2-4 lines: one strength, the most \
important grammar or content fix with the correction), then ask the next question \
in English. Start with a short greeting and the first question when the learner \
says "START"."""


class AIUnavailable(Exception):
    """La IA no está disponible; el mensaje explica por qué, en español."""


Writer = Callable[[str], None]


class ClaudeTutor:
    def __init__(self, offline: bool = False):
        self.model = os.environ.get("ENGLISHBOOST_MODEL", DEFAULT_MODEL)
        self.client = None
        self.reason = ""
        if offline:
            self.reason = "Modo offline activado en Ajustes."
        elif anthropic is None:
            self.reason = "El paquete 'anthropic' no está instalado (pip install anthropic)."
        else:
            try:
                client = anthropic.Anthropic()
            except Exception as exc:  # credenciales mal configuradas, etc.
                self.reason = f"No se pudo crear el cliente de Claude: {exc}"
            else:
                # El SDK resuelve ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN o un perfil
                # de 'ant auth login'; si no encontró ninguno, quedamos offline.
                if client.api_key or client.auth_token or getattr(client, "credentials", None):
                    self.client = client
                else:
                    self.reason = ("No hay credenciales de Claude: define ANTHROPIC_API_KEY "
                                   "o ejecuta 'ant auth login'.")

    @property
    def available(self) -> bool:
        return self.client is not None

    def _stream(self, system: str, messages: list, write: Writer,
                effort: str = "medium", max_tokens: int = 8000):
        """Envía la petición en streaming, escribe el texto conforme llega y
        devuelve el mensaje final completo."""
        if not self.available:
            raise AIUnavailable(self.reason)
        try:
            with self.client.beta.messages.stream(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
                output_config={"effort": effort},
                betas=[FALLBACK_BETA],
                fallbacks="default",
            ) as stream:
                for text in stream.text_stream:
                    write(text)
                final = stream.get_final_message()
        except anthropic.AuthenticationError:
            self.client = None
            self.reason = ("Credenciales inválidas. Configura ANTHROPIC_API_KEY "
                           "o ejecuta 'ant auth login'.")
            raise AIUnavailable(self.reason)
        except anthropic.PermissionDeniedError:
            raise AIUnavailable("Tu clave de API no tiene permiso para este modelo.")
        except anthropic.NotFoundError:
            raise AIUnavailable(f"Modelo no encontrado: {self.model}. Revisa ENGLISHBOOST_MODEL.")
        except anthropic.RateLimitError:
            raise AIUnavailable("Límite de uso alcanzado. Espera un minuto e inténtalo de nuevo.")
        except anthropic.APIConnectionError:
            raise AIUnavailable("Sin conexión con la API. Puedes seguir en modo offline.")
        except anthropic.APIStatusError as exc:
            raise AIUnavailable(f"Error de la API ({exc.status_code}). Inténtalo más tarde.")

        if final.stop_reason == "refusal":
            write("\n[La IA no pudo responder a este mensaje. Prueba a reformularlo.]")
        elif final.stop_reason == "max_tokens":
            write("\n[Respuesta recortada por longitud.]")
        return final

    # ---------- Feedback puntual ----------
    def interview_feedback(self, question: str, answer: str, write: Writer) -> None:
        self._stream(
            INTERVIEW_FEEDBACK_PROMPT,
            [{"role": "user", "content": f"Interview question: {question}\n\nMy answer:\n{answer}"}],
            write,
        )

    def writing_feedback(self, text: str, kind: str, context: str, write: Writer) -> None:
        content = f"Context: {context or 'not specified'}\n\nMy {kind}:\n{text}"
        self._stream(
            WRITING_FEEDBACK_PROMPT.format(kind=kind),
            [{"role": "user", "content": content}],
            write,
        )

    def explain_mistake(self, exercise: dict, answer: str, expected: str, write: Writer) -> None:
        content = (
            f"Exercise: {exercise.get('prompt') or ' / '.join(exercise.get('words', []))}\n"
            f"Topic: {exercise.get('topic', '')}\n"
            f"Learner's answer: {answer}\n"
            f"Expected answer: {expected}"
        )
        self._stream(MISTAKE_PROMPT, [{"role": "user", "content": content}],
                     write, effort="low", max_tokens=2000)

    # ---------- Conversaciones ----------
    def conversation(self, system: str) -> "Conversation":
        return Conversation(self, system)


class Conversation:
    """Conversación multi-turno. El historial solo se amplía (nunca se edita),
    y se reenvía el contenido completo de cada respuesta."""

    def __init__(self, tutor: ClaudeTutor, system: str):
        self.tutor = tutor
        self.system = system
        self.messages: list = []

    def send(self, text: str, write: Writer) -> None:
        self.messages.append({"role": "user", "content": text})
        try:
            final = self.tutor._stream(self.system, self.messages, write,
                                       effort="low", max_tokens=4000)
        except AIUnavailable:
            self.messages.pop()  # deja el historial como estaba para reintentar
            raise
        if final.stop_reason == "refusal":
            self.messages.pop()  # no se guarda un turno rechazado
            return
        self.messages.append({"role": "assistant", "content": final.content})

    @property
    def turns(self) -> int:
        return sum(1 for m in self.messages if m["role"] == "user")
