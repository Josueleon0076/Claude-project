"""Persistencia local en SQLite: perfil, progreso, vocabulario (SRS) y estadísticas."""

from __future__ import annotations

import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

LEVELS = ["A1-A2", "B1", "B2-C1"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS user (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    name            TEXT    NOT NULL DEFAULT 'Learner',
    level           TEXT    NOT NULL DEFAULT 'A1-A2',
    xp              INTEGER NOT NULL DEFAULT 0,
    streak          INTEGER NOT NULL DEFAULT 0,
    best_streak     INTEGER NOT NULL DEFAULT 0,
    last_active     TEXT,
    created_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    lesson_id       TEXT PRIMARY KEY,
    level           TEXT    NOT NULL,
    best_score      REAL    NOT NULL DEFAULT 0,
    attempts        INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS vocabulary (
    word            TEXT PRIMARY KEY,
    translation     TEXT    NOT NULL,
    example         TEXT,
    level           TEXT    NOT NULL,
    ease            REAL    NOT NULL DEFAULT 2.5,
    interval_days   INTEGER NOT NULL DEFAULT 0,
    repetitions     INTEGER NOT NULL DEFAULT 0,
    due_date        TEXT    NOT NULL,
    times_seen      INTEGER NOT NULL DEFAULT 0,
    times_wrong     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id       TEXT,
    exercise_id     TEXT,
    topic           TEXT,
    correct         INTEGER NOT NULL,
    user_answer     TEXT,
    created_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mode            TEXT    NOT NULL,
    score           INTEGER NOT NULL,
    total           INTEGER NOT NULL,
    xp_earned       INTEGER NOT NULL,
    duration_sec    INTEGER NOT NULL,
    created_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);
"""


def default_db_path() -> Path:
    custom = os.environ.get("ENGLISHBOOST_DB")
    if custom:
        return Path(custom)
    return Path.home() / ".englishboost" / "englishboost.db"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


class Database:
    def __init__(self, path: Path | str | None = None):
        self.path = Path(path) if path else default_db_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.execute(
            "INSERT OR IGNORE INTO user (id, created_at) VALUES (1, ?)", (_now(),)
        )
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # ---------- Perfil ----------
    def get_user(self) -> sqlite3.Row:
        return self.conn.execute("SELECT * FROM user WHERE id = 1").fetchone()

    def is_new_user(self) -> bool:
        return self.get_setting("onboarded") != "1"

    def set_name(self, name: str) -> None:
        self.conn.execute("UPDATE user SET name = ? WHERE id = 1", (name,))
        self.conn.commit()

    def set_level(self, level: str) -> None:
        if level not in LEVELS:
            raise ValueError(f"Nivel desconocido: {level}")
        self.conn.execute("UPDATE user SET level = ? WHERE id = 1", (level,))
        self.conn.commit()

    def add_xp(self, amount: int) -> None:
        self.conn.execute("UPDATE user SET xp = xp + ? WHERE id = 1", (amount,))
        self.conn.commit()

    def touch_streak(self, today: date | None = None) -> int:
        """Actualiza la racha de días al completar una sesión. Devuelve la racha."""
        today = today or date.today()
        user = self.get_user()
        last = date.fromisoformat(user["last_active"]) if user["last_active"] else None
        if last == today:
            streak = user["streak"]
        elif last == today - timedelta(days=1):
            streak = user["streak"] + 1
        else:
            streak = 1
        best = max(streak, user["best_streak"])
        self.conn.execute(
            "UPDATE user SET streak = ?, best_streak = ?, last_active = ? WHERE id = 1",
            (streak, best, today.isoformat()),
        )
        self.conn.commit()
        return streak

    def current_streak(self, today: date | None = None) -> int:
        """Racha vigente: se pierde si ayer no hubo práctica."""
        today = today or date.today()
        user = self.get_user()
        if not user["last_active"]:
            return 0
        last = date.fromisoformat(user["last_active"])
        return user["streak"] if (today - last).days <= 1 else 0

    # ---------- Lecciones ----------
    def record_lesson(self, lesson_id: str, level: str, score: float) -> None:
        completed = _now() if score >= 0.7 else None
        self.conn.execute(
            """
            INSERT INTO lesson_progress (lesson_id, level, best_score, attempts, completed_at)
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(lesson_id) DO UPDATE SET
                best_score   = MAX(best_score, excluded.best_score),
                attempts     = attempts + 1,
                completed_at = COALESCE(completed_at, excluded.completed_at)
            """,
            (lesson_id, level, score, completed),
        )
        self.conn.commit()

    def completed_lessons(self, level: str | None = None) -> set[str]:
        sql = "SELECT lesson_id FROM lesson_progress WHERE completed_at IS NOT NULL"
        params: tuple = ()
        if level:
            sql += " AND level = ?"
            params = (level,)
        return {r["lesson_id"] for r in self.conn.execute(sql, params)}

    def lesson_scores(self) -> dict[str, sqlite3.Row]:
        rows = self.conn.execute("SELECT * FROM lesson_progress")
        return {r["lesson_id"]: r for r in rows}

    # ---------- Intentos y estadísticas ----------
    def record_attempt(
        self, lesson_id: str, exercise_id: str, topic: str, correct: bool, answer: str
    ) -> None:
        self.conn.execute(
            """INSERT INTO attempts (lesson_id, exercise_id, topic, correct, user_answer, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (lesson_id, exercise_id, topic, int(correct), answer, _now()),
        )
        self.conn.commit()

    def record_session(
        self, mode: str, score: int, total: int, xp: int, duration_sec: int
    ) -> None:
        self.conn.execute(
            """INSERT INTO sessions (mode, score, total, xp_earned, duration_sec, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (mode, score, total, xp, duration_sec, _now()),
        )
        self.conn.commit()

    def accuracy(self) -> tuple[int, int]:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(correct), 0) AS ok, COUNT(*) AS total FROM attempts"
        ).fetchone()
        return row["ok"], row["total"]

    def weakest_topics(self, limit: int = 5) -> list[sqlite3.Row]:
        return self.conn.execute(
            """
            SELECT topic,
                   COUNT(*)                     AS total,
                   SUM(1 - correct)             AS errors,
                   ROUND(AVG(correct) * 100, 0) AS pct
            FROM attempts
            GROUP BY topic
            HAVING errors > 0
            ORDER BY errors DESC, pct ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    def recent_sessions(self, limit: int = 5) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM sessions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()

    def total_study_minutes(self) -> int:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(duration_sec), 0) AS s FROM sessions"
        ).fetchone()
        return row["s"] // 60

    # ---------- Vocabulario / Spaced Repetition ----------
    def add_vocab(self, word: str, translation: str, example: str, level: str) -> bool:
        cur = self.conn.execute(
            """INSERT OR IGNORE INTO vocabulary (word, translation, example, level, due_date)
               VALUES (?, ?, ?, ?, ?)""",
            (word, translation, example, level, date.today().isoformat()),
        )
        self.conn.commit()
        return cur.rowcount > 0

    def due_cards(self, limit: int = 15, today: date | None = None) -> list[sqlite3.Row]:
        today = today or date.today()
        return self.conn.execute(
            """SELECT * FROM vocabulary WHERE due_date <= ?
               ORDER BY times_wrong DESC, due_date ASC LIMIT ?""",
            (today.isoformat(), limit),
        ).fetchall()

    def update_card(
        self, word: str, ease: float, interval: int, reps: int, due: date, wrong: bool
    ) -> None:
        self.conn.execute(
            """UPDATE vocabulary
               SET ease = ?, interval_days = ?, repetitions = ?, due_date = ?,
                   times_seen = times_seen + 1, times_wrong = times_wrong + ?
               WHERE word = ?""",
            (ease, interval, reps, due.isoformat(), int(wrong), word),
        )
        self.conn.commit()

    def vocab_counts(self, today: date | None = None) -> dict[str, int]:
        today = today or date.today()
        row = self.conn.execute(
            """SELECT COUNT(*) AS total,
                      COALESCE(SUM(due_date <= ?), 0)    AS due,
                      COALESCE(SUM(interval_days >= 21), 0) AS mastered
               FROM vocabulary""",
            (today.isoformat(),),
        ).fetchone()
        return dict(row)

    def most_failed_words(self, limit: int = 5) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT word, translation, times_wrong FROM vocabulary
               WHERE times_wrong > 0 ORDER BY times_wrong DESC LIMIT ?""",
            (limit,),
        ).fetchall()

    # ---------- Ajustes ----------
    def get_setting(self, key: str, default: str | None = None) -> str | None:
        row = self.conn.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        self.conn.commit()
