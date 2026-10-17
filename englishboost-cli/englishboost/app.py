"""EnglishBoost CLI: menú principal y flujos de práctica."""

from __future__ import annotations

import argparse
import random
import time

from rich.panel import Panel
from rich.table import Table

from englishboost import (__version__, achievements, content, exercises, offline_feedback,
                          srs, ui)
from englishboost.ai import (CONVERSATION_PROMPT, INTERVIEWER_PROMPT, AIUnavailable,
                             ClaudeTutor)
from englishboost.db import LEVELS, Database
from englishboost.ui import console

LESSON_PASS = 0.7

TYPE_LABELS = {
    "mcq": "Opción múltiple",
    "reading": "Comprensión lectora",
    "translate": "Traducción ES → EN",
    "reorder": "Ordena las palabras",
    "fill": "Completa el espacio",
}

SCENARIOS = [
    ("Daily stand-up", "A daily stand-up meeting of a remote software team. You are the "
     "Scrum Master; ask the learner what they did yesterday, what they'll do today and "
     "whether they have blockers."),
    ("Small talk", "Casual small talk with a new coworker from another country at the "
     "start of a video call (weekend, hobbies, weather, time zones)."),
    ("Negociar un plazo", "The learner is a developer and you are a demanding client who "
     "wants a feature earlier than planned. The learner must negotiate the deadline "
     "politely and propose alternatives."),
    ("Primer día (onboarding)", "The learner's first day at a remote international "
     "company. You are their onboarding buddy explaining tools, team rituals and "
     "answering their questions."),
    ("Pedir ayuda técnica", "The learner is stuck on a bug and asks you, a senior "
     "engineer, for help over Slack huddle. Ask clarifying questions about the problem."),
]


class App:
    def __init__(self, db: Database, offline: bool = False):
        self.db = db
        offline = offline or db.get_setting("offline") == "1"
        self.tutor = ClaudeTutor(offline=offline)

    # ================== Utilidades ==================
    def header(self) -> None:
        user = self.db.get_user()
        streak = self.db.current_streak()
        due = self.db.vocab_counts()["due"]
        ai = "[green]● IA conectada[/]" if self.tutor.available else "[yellow]● Modo offline[/]"
        name, _ = content.LEVEL_INFO[user["level"]]
        console.print(Panel(
            f"[bold]{user['name']}[/]  ·  Nivel [bold cyan]{user['level']}[/] ({name})  ·  "
            f"⭐ {user['xp']} XP  ·  🔥 {streak} día(s)  ·  🏅 {len(self.db.unlocked_achievements())} logros  ·  "
            f"🃏 {due} por repasar  ·  {ai}",
            title=f"[bold magenta]EnglishBoost CLI[/] v{__version__}", border_style="magenta",
        ))

    def finish_session(self, mode: str, score: int, total: int, xp: int, started: float) -> int:
        self.db.add_xp(xp)
        self.db.record_session(mode, score, total, xp, int(time.time() - started))
        return self.db.touch_streak()

    def announce_achievements(self) -> None:
        """Muestra los logros recién desbloqueados (si los hay)."""
        new = achievements.check_new(self.db)
        if not new:
            return
        lines = [f"{a.medal} {a.icon}  [bold]{a.name}[/] — {a.description}  [green]+{a.xp_bonus} XP[/]"
                 for a in new]
        console.print(Panel("\n".join(lines),
                            title="🎉 ¡Nuevo logro desbloqueado!" if len(new) == 1
                            else f"🎉 ¡{len(new)} logros desbloqueados!",
                            border_style="bright_yellow"))
        ui.pause()

    # ================== Onboarding ==================
    def onboarding(self) -> None:
        ui.clear()
        ui.title("👋 ¡Bienvenido/a a EnglishBoost CLI!",
                 "De A1 a inglés profesional para trabajo remoto")
        console.print(
            "\nSesiones cortas de 5-10 minutos, explicaciones en español cuando te equivocas "
            "y repaso inteligente de las palabras que más te cuestan.\n")
        name = ui.ask("¿Cómo te llamas?", default="Learner").strip() or "Learner"
        self.db.set_name(name)
        console.print("\n¿Desde qué nivel quieres empezar?\n")
        options = [(str(i + 1), f"[bold]{lvl}[/] — {content.LEVEL_INFO[lvl][0]}: "
                    f"[dim]{content.LEVEL_INFO[lvl][1]}[/]") for i, lvl in enumerate(LEVELS)]
        options.append(("4", "No lo sé: hacer un [bold]test de nivel rápido[/] (9 preguntas)"))
        choice = ui.choose("Elige una opción", options, default="1")
        level = LEVELS[int(choice) - 1] if choice != "4" else self.placement_test()
        self.db.set_level(level)
        self.db.set_setting("onboarded", "1")
        ui.success(f"¡Listo, {name}! Empiezas en el nivel [bold]{level}[/].")
        if not self.tutor.available:
            ui.info("Estás en modo offline. Para feedback con IA define ANTHROPIC_API_KEY "
                    "(ver README).")
        ui.pause()

    def placement_test(self) -> str:
        ui.clear()
        ui.title("🧭 Test de nivel", "3 preguntas por nivel · sin presión")
        rng = random.Random()
        level = LEVELS[0]
        for lvl in LEVELS:
            pool = [ex for l in content.lessons_for_level(lvl) for ex in l["exercises"]
                    if ex["type"] in ("mcq", "fill")]
            questions = rng.sample(pool, min(3, len(pool)))
            correct = 0
            console.print(f"\n[bold magenta]Bloque {lvl}[/]")
            for ex in questions:
                console.print(f"\n[bold]{ex['prompt']}[/]")
                if ex["type"] == "mcq":
                    for i, opt in enumerate(ex["options"], 1):
                        console.print(f"  [cyan]{i}[/]. {opt}")
                answer = ui.ask("Tu respuesta")
                correct += exercises.check(ex, answer).correct
            if correct >= 2:
                level = lvl
            else:
                break
        ui.info(f"Resultado del test: te recomendamos empezar en [bold]{level}[/].")
        return level

    # ================== 1. Lección del día ==================
    def pick_daily_lesson(self) -> dict:
        user = self.db.get_user()
        lessons = content.lessons_for_level(user["level"])
        done = self.db.completed_lessons()
        pending = [l for l in lessons if l["id"] not in done]
        if pending:
            return pending[0]
        # Todo completado: repasar la lección con peor puntuación.
        scores = self.db.lesson_scores()
        return min(lessons, key=lambda l: scores[l["id"]]["best_score"] if l["id"] in scores else 0)

    def daily_lesson(self) -> None:
        self.run_lesson(self.pick_daily_lesson())

    def run_lesson(self, lesson: dict) -> None:
        started = time.time()
        ui.clear()
        ui.title(f"📘 {lesson['title_es']}", f"{lesson['level']} · {lesson['title']}")
        console.print(f"\n[bold]Objetivo:[/] {lesson['goal']}\n")

        table = Table(title="Vocabulario clave", show_header=True, header_style="bold cyan")
        table.add_column("English")
        table.add_column("Español")
        table.add_column("Example", style="dim")
        for v in lesson["vocabulary"]:
            table.add_row(v["word"], v["translation"], v["example"])
        console.print(table)
        ui.pause()

        items = list(lesson["exercises"])
        correct = 0
        failed_topics: list[str] = []
        for i, ex in enumerate(items, 1):
            ok = self.run_exercise(lesson, ex, i, len(items))
            correct += ok
            if not ok:
                failed_topics.append(ex["topic"])

        score = correct / len(items)
        self.db.record_lesson(lesson["id"], lesson["level"], score)
        new_words = sum(self.db.add_vocab(v["word"], v["translation"], v["example"],
                                          lesson["level"]) for v in lesson["vocabulary"])
        xp = exercises.score_to_xp(correct, len(items))
        streak = self.finish_session(f"lesson:{lesson['id']}", correct, len(items), xp, started)
        self.lesson_summary(lesson, correct, len(items), xp, streak, new_words, failed_topics)
        self.check_level_up(lesson["level"])

    def run_exercise(self, lesson: dict, ex: dict, idx: int, total: int) -> bool:
        console.rule(f"[bold]{idx}/{total}[/] · {TYPE_LABELS[ex['type']]} · [dim]{ex['topic']}[/]")
        if ex["type"] == "reading":
            console.print(Panel(ex["passage"], title="📄 Lee el texto", border_style="blue"))
        console.print(f"\n[bold]{ex.get('prompt', 'Ordena las palabras para formar una oración:')}[/]\n")

        if ex["type"] in ("mcq", "reading"):
            for i, opt in enumerate(ex["options"], 1):
                console.print(f"  [cyan]{i}[/]. {opt}")
            answer = ui.ask("Número de tu respuesta")
        elif ex["type"] == "reorder":
            words = exercises.shuffled_words(ex)
            console.print("  " + "  ".join(f"[reverse] {w} [/]" for w in words) + "\n")
            answer = ui.ask("Escribe la oración ordenada")
        else:
            answer = ui.ask("Tu respuesta")

        result = exercises.check(ex, answer)
        self.db.record_attempt(lesson["id"], ex["id"], ex["topic"], result.correct, answer)
        if result.correct:
            ui.success("[bold green]¡Correcto![/]")
            if result.typo:
                ui.info(f"Ojo con la ortografía: [bold]{result.expected}[/]")
            return True

        ui.error(f"Respuesta correcta: [bold]{result.expected}[/]")
        ui.explain(ex["explanation"])
        if ex["type"] == "translate":
            # El error se convierte en una tarjeta de repaso.
            self.db.add_vocab(result.expected, ex["prompt"], "", lesson["level"])
        if self.tutor.available and ui.confirm("¿Quieres una explicación ampliada con IA?"):
            self.ai_call(lambda w: self.tutor.explain_mistake(ex, answer, result.expected, w))
        return False

    def lesson_summary(self, lesson, correct, total, xp, streak, new_words, failed_topics):
        pct = round(100 * correct / total)
        color = "green" if pct >= 70 else "yellow" if pct >= 50 else "red"
        lines = [
            f"Puntaje: [bold {color}]{correct}/{total} ({pct}%)[/]",
            f"XP ganada: [bold]+{xp}[/]   ·   Racha: 🔥 {streak} día(s)",
            f"Palabras nuevas en tu mazo de repaso: [bold]{new_words}[/]",
            "",
            "[bold]Palabras clave:[/] " + ", ".join(v["word"] for v in lesson["vocabulary"]),
        ]
        if failed_topics:
            unique = sorted(set(failed_topics))
            lines += ["", "[bold]Sugerencias de mejora:[/]"]
            lines += [f"  • Repasa: [yellow]{t}[/]" for t in unique]
            lines.append("  • Haz el 'Repaso de Tarjetas' mañana para fijar el vocabulario.")
        else:
            lines += ["", "[bold green]¡Sesión perfecta! 🎉[/]"]
        if pct < LESSON_PASS * 100:
            lines.append(f"\n[dim]Necesitas {int(LESSON_PASS * 100)}% para completar la lección; "
                         "volverá a aparecer en tu práctica del día.[/]")
        console.print(Panel("\n".join(lines), title="📊 Resultado", border_style=color))
        ui.pause()

    def check_level_up(self, level: str) -> None:
        user = self.db.get_user()
        if user["level"] != level or level == LEVELS[-1]:
            return
        ids = {l["id"] for l in content.lessons_for_level(level)}
        if ids <= self.db.completed_lessons(level):
            nxt = LEVELS[LEVELS.index(level) + 1]
            console.print(Panel(f"🏆 ¡Completaste todas las lecciones de [bold]{level}[/]!",
                                border_style="green"))
            if ui.confirm(f"¿Subir al nivel {nxt}?", default=True):
                self.db.set_level(nxt)
                self.db.add_xp(100)
                ui.success(f"¡Bienvenido/a a {nxt}! +100 XP de bonificación.")
                ui.pause()

    # ================== 2. Repaso (SRS) ==================
    def review(self) -> None:
        cards = self.db.due_cards()
        ui.clear()
        ui.title("🃏 Repaso de Tarjetas", "Repetición espaciada: lo que fallas vuelve antes")
        if not cards:
            counts = self.db.vocab_counts()
            if counts["total"] == 0:
                ui.info("Aún no tienes tarjetas. Completa una lección para añadir vocabulario.")
            else:
                ui.success("¡Estás al día! No hay tarjetas pendientes hoy. Vuelve mañana.")
            ui.pause()
            return

        started = time.time()
        correct = 0
        console.print(f"\nTienes [bold]{len(cards)}[/] tarjeta(s). Escribe en inglés.\n")
        for i, card in enumerate(cards, 1):
            console.rule(f"{i}/{len(cards)}")
            console.print(f"\n🇪🇸  [bold]{card['translation']}[/]\n")
            answer = ui.ask("🇬🇧 En inglés")
            result = self.check_card(card["word"], answer)
            if result.correct:
                quality = srs.HARD if result.typo else srs.GOOD
                ui.success("¡Correcto!" + (f" (ortografía: [bold]{card['word']}[/])" if result.typo else ""))
                correct += 1
            else:
                quality = srs.AGAIN
                ui.error(f"Era: [bold]{card['word']}[/]")
            if card["example"]:
                console.print(f"   [dim]Ejemplo: {card['example']}[/]")
            state = srs.schedule(card["ease"], card["interval_days"], card["repetitions"], quality)
            self.db.update_card(card["word"], state.ease, state.interval, state.repetitions,
                                state.due, wrong=not result.correct)
            console.print()

        xp = correct * 5
        streak = self.finish_session("review", correct, len(cards), xp, started)
        console.print(Panel(
            f"Aciertos: [bold]{correct}/{len(cards)}[/]  ·  +{xp} XP  ·  🔥 {streak} día(s)\n"
            "[dim]Las tarjetas falladas volverán mañana; las acertadas, en unos días.[/]",
            title="📊 Resultado del repaso", border_style="green"))
        ui.pause()

    @staticmethod
    def check_card(word: str, answer: str) -> exercises.Result:
        answers = [word]
        if word.startswith("to "):
            answers.append(word[3:])  # 'to fix' también acepta 'fix'
        return exercises.check({"type": "fill", "answers": answers}, answer)

    # ================== 3. Entrevista / Conversación ==================
    def speaking_menu(self) -> None:
        while True:
            ui.clear()
            ui.title("🎤 Simulación de Entrevista / Conversación")
            ai_tag = "" if self.tutor.available else " [dim](requiere IA)[/]"
            choice = ui.choose("Elige una práctica", [
                ("1", "Entrevista de trabajo: banco de preguntas + feedback"),
                ("2", f"Entrevista en vivo con un entrevistador IA{ai_tag}"),
                ("3", f"Conversación / role-play en tiempo real{ai_tag}"),
                ("4", "Corrección de correo o mensaje profesional"),
                ("0", "Volver"),
            ], default="1")
            if choice == "0":
                return
            {"1": self.interview_practice, "2": self.live_interview,
             "3": self.roleplay, "4": self.writing_review}[choice]()
            self.announce_achievements()

    def interview_practice(self) -> None:
        questions = content.interview_questions()
        ui.clear()
        ui.title("💼 Práctica de entrevista",
                 "Feedback con IA" if self.tutor.available else "Feedback offline")
        options = [(str(i), f"[dim]{q['category']}[/] · {q['question']}")
                   for i, q in enumerate(questions, 1)]
        options.append(("0", "Pregunta aleatoria"))
        choice = ui.choose("¿Qué pregunta quieres practicar?", options, default="0")
        q = random.choice(questions) if choice == "0" else questions[int(choice) - 1]

        started = time.time()
        console.print(Panel(f"[bold]{q['question']}[/]", title="🧑‍💼 Interviewer",
                            border_style="blue"))
        console.print(f"[yellow]💡 Consejo:[/] {q['tip_es']}\n")
        answer = ui.multiline("Escribe tu respuesta en inglés")

        score = None
        if self.tutor.available:
            console.print()
            if not self.ai_call(lambda w: self.tutor.interview_feedback(q["question"], answer, w)):
                score = self.offline_answer_feedback(q, answer)
        else:
            score = self.offline_answer_feedback(q, answer)

        console.print(Panel(q["sample"], title="📝 Ejemplo de respuesta modelo",
                            border_style="green"))
        xp = 15 if score is None else score * 2
        self.finish_session("interview", *((score, 10) if score else (1, 1)), xp, started)
        ui.success(f"+{xp} XP")
        ui.pause()

    def offline_answer_feedback(self, q: dict, answer: str) -> int:
        fb = offline_feedback.evaluate_answer(q, answer)
        self.show_feedback(fb)
        return fb.score

    @staticmethod
    def show_feedback(fb: offline_feedback.Feedback) -> None:
        lines = [f"Puntuación orientativa: [bold]{fb.score}/10[/]", ""]
        lines += [f"[green]✓[/] {g}" for g in fb.good]
        lines += [f"[yellow]→[/] {m}" for m in fb.improve]
        console.print(Panel("\n".join(lines), title="📋 Feedback (offline)",
                            border_style="yellow"))

    def live_interview(self) -> None:
        if not self.require_ai():
            return
        ui.clear()
        role = ui.ask("¿Para qué puesto quieres practicar?", default="Remote Software Developer")
        system = INTERVIEWER_PROMPT.format(role=role, level=self.db.get_user()["level"])
        self.chat_loop("🧑‍💼 Entrevista en vivo", system, mode="live-interview")

    def roleplay(self) -> None:
        if not self.require_ai():
            return
        ui.clear()
        ui.title("💬 Conversación en tiempo real")
        options = [(str(i), name) for i, (name, _) in enumerate(SCENARIOS, 1)]
        options.append(("0", "Volver"))
        choice = ui.choose("Elige un escenario", options, default="1")
        if choice == "0":
            return
        name, scenario = SCENARIOS[int(choice) - 1]
        system = CONVERSATION_PROMPT.format(scenario=scenario, level=self.db.get_user()["level"])
        self.chat_loop(f"💬 {name}", system, mode="conversation")

    def chat_loop(self, heading: str, system: str, mode: str) -> None:
        ui.clear()
        ui.title(heading, "Escribe en inglés · '/salir' para terminar")
        convo = self.tutor.conversation(system)
        started = time.time()
        console.print("\n[bold blue]Claude:[/] ", end="")
        if not self.ai_call(lambda w: convo.send("START", w), newline=False):
            ui.pause()
            return
        while True:
            console.print()
            text = console.input("\n[bold green]Tú:[/] ").strip()
            if not text:
                continue
            if text.lower() in ("/salir", "/exit", "/quit"):
                break
            console.print("\n[bold blue]Claude:[/] ", end="")
            if not self.ai_call(lambda w: convo.send(text, w), newline=False):
                break
        turns = max(0, convo.turns - 1)  # sin contar el START
        xp = turns * 5
        streak = self.finish_session(mode, turns, turns, xp, started)
        ui.success(f"Conversación terminada: {turns} intervención(es), +{xp} XP, 🔥 {streak}")
        ui.pause()

    def writing_review(self) -> None:
        ui.clear()
        ui.title("✉️  Corrección de correo / mensaje", "Gramática y tono profesional")
        kind = {"1": "email", "2": "Slack message", "3": "LinkedIn message"}[
            ui.choose("¿Qué vas a escribir?", [
                ("1", "Correo (email)"), ("2", "Mensaje de Slack/Teams"),
                ("3", "Mensaje de LinkedIn a un reclutador")], default="1")]
        context = ui.ask("Contexto breve (a quién y para qué)", default="")
        text = ui.multiline(f"Escribe tu {kind} en inglés")
        started = time.time()
        console.print()
        ok = self.tutor.available and self.ai_call(
            lambda w: self.tutor.writing_feedback(text, kind, context, w))
        score = None
        if not ok:
            fb = offline_feedback.evaluate_email(text)
            self.show_feedback(fb)
            score = fb.score
        xp = 15 if score is None else score * 2
        self.finish_session("writing", *((score, 10) if score else (1, 1)), xp, started)
        ui.success(f"+{xp} XP")
        ui.pause()

    def require_ai(self) -> bool:
        if self.tutor.available:
            return True
        ui.error(f"Esta práctica necesita conexión con Claude. {self.tutor.reason}")
        ui.info("Mientras tanto, prueba la opción 1 (entrevista con feedback offline).")
        ui.pause()
        return False

    def ai_call(self, fn, newline: bool = True) -> bool:
        """Ejecuta una llamada a la IA mostrando el streaming. Devuelve False si falla."""
        try:
            if newline:
                console.print("[bold blue]🤖 Claude:[/]\n")
            with console.status("[dim]Pensando...[/]") as status:
                first = True

                def write(chunk: str) -> None:
                    nonlocal first
                    if first:
                        status.stop()
                        first = False
                    ui.stream_text(chunk)

                fn(write)
            console.print()
            return True
        except AIUnavailable as exc:
            console.print()
            ui.error(str(exc))
            return False

    # ================== 4. Progreso ==================
    def stats(self) -> None:
        ui.clear()
        ui.title("📈 Mi Progreso y Estadísticas")
        user = self.db.get_user()
        ok, total = self.db.accuracy()
        acc = f"{round(100 * ok / total)}%" if total else "—"
        vocab = self.db.vocab_counts()

        general = Table.grid(padding=(0, 3))
        general.add_column(style="bold")
        general.add_column()
        general.add_row("Nivel actual", f"{user['level']} — {content.LEVEL_INFO[user['level']][0]}")
        general.add_row("XP total", f"⭐ {user['xp']}")
        general.add_row("Racha", f"🔥 {self.db.current_streak()} día(s)  (mejor: {user['best_streak']})")
        general.add_row("Tiempo de estudio", f"{self.db.total_study_minutes()} min")
        general.add_row("Precisión", f"{acc}  ({ok}/{total} ejercicios)")
        general.add_row("Vocabulario", f"{vocab['total']} palabras · {vocab['mastered']} dominadas · "
                                       f"{vocab['due']} por repasar")
        console.print(Panel(general, title="General", border_style="cyan"))

        levels = Table(title="Progreso por nivel", header_style="bold cyan")
        levels.add_column("Nivel")
        levels.add_column("Lecciones completadas")
        for lvl in LEVELS:
            n_total = len(content.lessons_for_level(lvl))
            n_done = len(self.db.completed_lessons(lvl))
            levels.add_row(lvl, ui.progress_bar(n_done, n_total))
        console.print(levels)

        weak = self.db.weakest_topics()
        if weak:
            t = Table(title="Temas a reforzar", header_style="bold yellow")
            t.add_column("Tema")
            t.add_column("Errores", justify="right")
            t.add_column("Acierto", justify="right")
            for row in weak:
                t.add_row(row["topic"], str(row["errors"]), f"{int(row['pct'])}%")
            console.print(t)

        words = self.db.most_failed_words()
        if words:
            t = Table(title="Palabras que más te cuestan", header_style="bold red")
            t.add_column("English")
            t.add_column("Español")
            t.add_column("Fallos", justify="right")
            for w in words:
                t.add_row(w["word"], w["translation"], str(w["times_wrong"]))
            console.print(t)

        recent = self.db.recent_sessions()
        if recent:
            t = Table(title="Últimas sesiones", header_style="bold")
            t.add_column("Fecha")
            t.add_column("Modo")
            t.add_column("Puntaje", justify="right")
            t.add_column("XP", justify="right")
            for s in recent:
                t.add_row(s["created_at"].replace("T", " ")[:16], s["mode"],
                          f"{s['score']}/{s['total']}", f"+{s['xp_earned']}")
            console.print(t)
        ui.pause()

    # ================== 5. Logros y medallas ==================
    def achievements_screen(self) -> None:
        ui.clear()
        ui.title("🏅 Mis Logros y Medallas")
        unlocked = self.db.unlocked_achievements()
        stats = self.db.achievement_stats()
        items = achievements.all_achievements()
        console.print(f"\nDesbloqueados: [bold]{len(unlocked)}/{len(items)}[/]   "
                      + "   ".join(f"{icon} {sum(1 for a in items if a.tier == t and a.id in unlocked)}"
                                   f"/{sum(1 for a in items if a.tier == t)} {name}"
                                   for t, (icon, name, _) in achievements.TIERS.items()) + "\n")
        categories: dict[str, list] = {}
        for a in items:
            categories.setdefault(a.category, []).append(a)
        for category, group in categories.items():
            table = Table(title=category, header_style="bold cyan", show_lines=False,
                          title_justify="left")
            table.add_column("", width=4)
            table.add_column("Logro")
            table.add_column("Cómo conseguirlo")
            table.add_column("Progreso / Fecha")
            for a in group:
                if a.id in unlocked:
                    table.add_row(f"{a.medal}{a.icon}", f"[bold]{a.name}[/]", a.description,
                                  f"[green]✓ {unlocked[a.id][:10]}[/]")
                else:
                    done, goal = achievements.progress(a, stats)
                    table.add_row("🔒", f"[dim]{a.name}[/]", f"[dim]{a.description}[/]",
                                  ui.progress_bar(done, goal, width=10))
            console.print(table)
        ui.pause()

    # ================== 6. Explorar lecciones ==================
    def browse(self) -> None:
        ui.clear()
        ui.title("📚 Explorar lecciones")
        scores = self.db.lesson_scores()
        lessons = content.all_lessons()
        options = []
        for i, l in enumerate(lessons, 1):
            s = scores.get(l["id"])
            mark = "[green]✓[/]" if s and s["completed_at"] else (
                f"[yellow]{round(s['best_score'] * 100)}%[/]" if s else "[dim]·[/]")
            options.append((str(i), f"{mark} [cyan]{l['level']:<6}[/] {l['title_es']}"))
        options.append(("0", "Volver"))
        choice = ui.choose("Elige una lección", options, default="0")
        if choice != "0":
            self.run_lesson(lessons[int(choice) - 1])

    # ================== 7. Ajustes ==================
    def settings(self) -> None:
        while True:
            ui.clear()
            ui.title("⚙️  Ajustes")
            user = self.db.get_user()
            offline = self.db.get_setting("offline") == "1"
            console.print(f"Base de datos: [dim]{self.db.path}[/]")
            console.print(f"Modelo de IA:  [dim]{self.tutor.model}[/]")
            if not self.tutor.available:
                console.print(f"Estado IA:     [yellow]{self.tutor.reason}[/]")
            console.print()
            choice = ui.choose("¿Qué quieres cambiar?", [
                ("1", f"Nombre ({user['name']})"),
                ("2", f"Nivel ({user['level']})"),
                ("3", f"Modo offline forzado ({'activado' if offline else 'desactivado'})"),
                ("4", "Repetir el test de nivel"),
                ("0", "Volver"),
            ], default="0")
            if choice == "0":
                return
            if choice == "1":
                self.db.set_name(ui.ask("Nuevo nombre", default=user["name"]))
            elif choice == "2":
                opts = [(str(i + 1), lvl) for i, lvl in enumerate(LEVELS)]
                self.db.set_level(LEVELS[int(ui.choose("Nivel", opts)) - 1])
            elif choice == "3":
                self.db.set_setting("offline", "0" if offline else "1")
                self.tutor = ClaudeTutor(offline=not offline)
            elif choice == "4":
                level = self.placement_test()
                if ui.confirm(f"¿Cambiar tu nivel a {level}?", default=True):
                    self.db.set_level(level)
                ui.pause()

    # ================== Menú principal ==================
    def run(self) -> None:
        if self.db.is_new_user():
            self.onboarding()
        actions = {
            "1": self.daily_lesson, "2": self.review, "3": self.speaking_menu,
            "4": self.stats, "5": self.achievements_screen, "6": self.browse,
            "7": self.settings,
        }
        while True:
            ui.clear()
            self.header()
            due = self.db.vocab_counts()["due"]
            choice = ui.choose("¿Qué quieres hacer hoy?", [
                ("1", "📘 Lección / Práctica del Día [dim](modo rápido)[/]"),
                ("2", f"🃏 Repaso de Tarjetas (Spaced Repetition) [dim]({due} pendientes)[/]"),
                ("3", "🎤 Simulación de Entrevista / Conversación"),
                ("4", "📈 Mi Progreso y Estadísticas"),
                ("5", "🏅 Mis Logros y Medallas"),
                ("6", "📚 Explorar todas las lecciones"),
                ("7", "⚙️  Ajustes"),
                ("0", "Salir"),
            ], default="1")
            if choice == "0":
                break
            try:
                actions[choice]()
                self.announce_achievements()
            except KeyboardInterrupt:
                console.print("\n[dim]Sesión interrumpida. Volviendo al menú...[/]")
                time.sleep(0.6)
        console.print("\n[bold magenta]See you soon! 👋[/] Keep your streak alive. 🔥\n")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="englishboost",
                                     description="Aprende inglés de A1 a B2/C1 desde la terminal.")
    parser.add_argument("--db", help="Ruta del archivo SQLite (por defecto ~/.englishboost/)")
    parser.add_argument("--offline", action="store_true", help="No usar la API de Claude")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    args = parser.parse_args(argv)

    db = Database(args.db)
    try:
        App(db, offline=args.offline).run()
    except (KeyboardInterrupt, EOFError):
        console.print("\n[bold magenta]See you soon! 👋[/]\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
