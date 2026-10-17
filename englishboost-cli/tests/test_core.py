from datetime import date, timedelta

import pytest

from englishboost import content, exercises, offline_feedback, srs
from englishboost.app import App
from englishboost.db import LEVELS, Database


# ---------- Contenido ----------
def test_every_level_has_lessons():
    for level in LEVELS:
        assert content.lessons_for_level(level), level


@pytest.mark.parametrize("lesson", content.all_lessons(), ids=lambda l: l["id"])
def test_lesson_is_well_formed(lesson):
    assert lesson["level"] in LEVELS
    assert lesson["vocabulary"] and lesson["exercises"]
    for ex in lesson["exercises"]:
        assert ex["type"] in ("mcq", "reading", "translate", "reorder", "fill"), ex["id"]
        assert ex["explanation"] and ex["topic"], ex["id"]
        if ex["type"] in ("mcq", "reading"):
            assert 0 <= ex["answer"] < len(ex["options"]), ex["id"]
        elif ex["type"] == "reorder":
            assert sorted(w.lower() for w in ex["words"]) == sorted(ex["answer"].lower().split()), ex["id"]
        else:
            assert ex["answers"], ex["id"]
        # La respuesta esperada siempre debe pasar su propia corrección.
        assert exercises.check(ex, exercises.expected_answers(ex)[0]).correct, ex["id"]


def test_exercise_ids_are_unique():
    ids = [ex["id"] for l in content.all_lessons() for ex in l["exercises"]]
    assert len(ids) == len(set(ids))


# ---------- Corrección de respuestas ----------
def test_normalize_handles_case_punctuation_and_contractions():
    assert exercises.normalize("I'm a Developer.") == exercises.normalize("i am a developer")
    assert exercises.normalize("We’re a team!") == "we are a team"


def test_mcq_accepts_number_or_text():
    ex = {"type": "mcq", "options": ["am", "is", "are"], "answer": 1}
    assert exercises.check(ex, "2").correct
    assert exercises.check(ex, "IS").correct
    assert not exercises.check(ex, "1").correct


def test_translate_tolerates_small_typos_only_in_long_answers():
    ex = {"type": "translate", "answers": ["We are a remote team"]}
    result = exercises.check(ex, "We are a remote taem")
    assert result.correct and result.typo
    assert not exercises.check({"type": "fill", "answers": ["is"]}, "it").correct


def test_shuffled_words_differs_from_answer():
    ex = {"words": ["My", "coworker", "is", "nice"], "answer": "My coworker is nice"}
    assert sorted(exercises.shuffled_words(ex)) == sorted(ex["words"])


def test_review_card_accepts_verb_without_to():
    assert App.check_card("to fix", "fix").correct
    assert App.check_card("to fix", "to fix").correct


# ---------- Repetición espaciada ----------
def test_srs_intervals_grow_and_reset_on_failure():
    today = date(2026, 1, 1)
    s1 = srs.schedule(2.5, 0, 0, srs.GOOD, today)
    s2 = srs.schedule(s1.ease, s1.interval, s1.repetitions, srs.GOOD, today)
    s3 = srs.schedule(s2.ease, s2.interval, s2.repetitions, srs.GOOD, today)
    assert (s1.interval, s2.interval) == (1, 3)
    assert s3.interval > s2.interval
    fail = srs.schedule(s3.ease, s3.interval, s3.repetitions, srs.AGAIN, today)
    assert fail.interval == 1 and fail.repetitions == 0 and fail.ease < s3.ease
    assert fail.ease >= 1.3


# ---------- Base de datos ----------
@pytest.fixture
def db(tmp_path):
    database = Database(tmp_path / "test.db")
    yield database
    database.close()


def test_streak_counts_consecutive_days(db):
    d = date(2026, 3, 10)
    assert db.touch_streak(d) == 1
    assert db.touch_streak(d) == 1          # mismo día
    assert db.touch_streak(d + timedelta(1)) == 2
    assert db.touch_streak(d + timedelta(5)) == 1  # se rompió la racha
    assert db.get_user()["best_streak"] == 2
    assert db.current_streak(d + timedelta(7)) == 0


def test_lesson_completion_requires_passing_score(db):
    db.record_lesson("a1-01", "A1-A2", 0.5)
    assert db.completed_lessons() == set()
    db.record_lesson("a1-01", "A1-A2", 0.8)
    db.record_lesson("a1-01", "A1-A2", 0.3)
    row = db.lesson_scores()["a1-01"]
    assert row["attempts"] == 3 and row["best_score"] == 0.8
    assert db.completed_lessons("A1-A2") == {"a1-01"}


def test_vocab_due_and_update(db):
    assert db.add_vocab("team", "equipo", "My team.", "A1-A2")
    assert not db.add_vocab("team", "equipo", "", "A1-A2")  # sin duplicados
    assert [c["word"] for c in db.due_cards()] == ["team"]
    db.update_card("team", 2.6, 3, 2, date.today() + timedelta(3), wrong=True)
    assert db.due_cards() == []
    assert db.vocab_counts()["total"] == 1
    assert db.most_failed_words()[0]["times_wrong"] == 1


def test_weakest_topics(db):
    db.record_attempt("a1-01", "x1", "verb to be", False, "am")
    db.record_attempt("a1-01", "x2", "verb to be", True, "is")
    db.record_attempt("a1-01", "x3", "articles", True, "an")
    weak = db.weakest_topics()
    assert [w["topic"] for w in weak] == ["verb to be"]
    assert db.accuracy() == (2, 3)


# ---------- Feedback offline ----------
def test_offline_interview_feedback_rewards_star_answers():
    q = next(q for q in content.interview_questions() if q["id"] == "int-02")
    weak = offline_feedback.evaluate_answer(q, "i fix bug")
    strong = offline_feedback.evaluate_answer(q, q["sample"])
    assert strong.score > weak.score
    assert any("mayúscula" in m for m in weak.improve)


def test_offline_email_feedback_flags_false_friend_and_imperatives():
    fb = offline_feedback.evaluate_email("Send me the report. Actually I work at Acme!!")
    joined = " ".join(fb.improve)
    assert "actually" in joined and "Could you" in joined and "saludo" in joined
