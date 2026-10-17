// Estado de progreso del usuario y operaciones puras sobre él.
// Equivale a la base SQLite de la CLI, pero guardado como un único JSON
// en el almacenamiento del teléfono.

import { addDays, daysBetween, schedule, todayISO } from './srs.js';

export const LEVELS = ['A1-A2', 'B1', 'B2-C1'];
export const LESSON_PASS = 0.7;
const MAX_SESSIONS = 30;

export function initialState(now = new Date()) {
  return {
    version: 1,
    onboarded: false,
    user: {
      name: 'Learner',
      level: LEVELS[0],
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastActive: null,
      createdAt: now.toISOString(),
    },
    lessons: {}, // id -> { level, bestScore, attempts, completedAt }
    vocab: {}, // word -> { translation, example, level, ease, interval, reps, due, seen, wrong }
    topics: {}, // topic -> { total, errors }
    totals: { correct: 0, answered: 0, studySeconds: 0 },
    modes: {}, // tipo de sesión -> { count, score }
    sessions: [], // últimas sesiones, la más reciente primero
    achievements: {}, // id -> fecha ISO de desbloqueo
  };
}

/** Une un estado guardado con el inicial, por si faltan campos de versiones anteriores. */
export function hydrate(saved) {
  const base = initialState();
  if (!saved || typeof saved !== 'object') return base;
  return { ...base, ...saved, user: { ...base.user, ...saved.user }, totals: { ...base.totals, ...saved.totals } };
}

export const clone = (state) => JSON.parse(JSON.stringify(state));

// ---------- Perfil ----------
export function setProfile(s, { name, level }) {
  if (name !== undefined) s.user.name = name.trim() || 'Learner';
  if (level !== undefined) {
    if (!LEVELS.includes(level)) throw new Error(`Nivel desconocido: ${level}`);
    s.user.level = level;
  }
}

export function touchStreak(s, today = todayISO()) {
  const last = s.user.lastActive;
  if (last === today) {
    // mismo día: la racha no cambia
  } else if (last && daysBetween(last, today) === 1) {
    s.user.streak += 1;
  } else {
    s.user.streak = 1;
  }
  s.user.bestStreak = Math.max(s.user.bestStreak, s.user.streak);
  s.user.lastActive = today;
  return s.user.streak;
}

export function currentStreak(s, today = todayISO()) {
  const last = s.user.lastActive;
  if (!last) return 0;
  return daysBetween(last, today) <= 1 ? s.user.streak : 0;
}

// ---------- Lecciones ----------
export function recordLesson(s, lessonId, level, score, now = new Date()) {
  const prev = s.lessons[lessonId] ?? { level, bestScore: 0, attempts: 0, completedAt: null };
  s.lessons[lessonId] = {
    level,
    bestScore: Math.max(prev.bestScore, score),
    attempts: prev.attempts + 1,
    completedAt: prev.completedAt ?? (score >= LESSON_PASS ? now.toISOString() : null),
  };
}

export function completedLessons(s, level) {
  return new Set(
    Object.entries(s.lessons)
      .filter(([, l]) => l.completedAt && (!level || l.level === level))
      .map(([id]) => id),
  );
}

export function pickDailyLesson(s, lessonsOfLevel) {
  const done = completedLessons(s);
  const pending = lessonsOfLevel.find((l) => !done.has(l.id));
  if (pending) return pending;
  // Todo completado: repasar la de peor puntuación.
  return [...lessonsOfLevel].sort(
    (a, b) => (s.lessons[a.id]?.bestScore ?? 0) - (s.lessons[b.id]?.bestScore ?? 0),
  )[0];
}

// ---------- Intentos y sesiones ----------
export function recordAttempt(s, topic, correct) {
  const t = s.topics[topic] ?? { total: 0, errors: 0 };
  s.topics[topic] = { total: t.total + 1, errors: t.errors + (correct ? 0 : 1) };
  s.totals.answered += 1;
  s.totals.correct += correct ? 1 : 0;
}

export function recordSession(s, { mode, score, total, xp, durationSec }, now = new Date()) {
  const kind = mode.startsWith('lesson:') ? 'lesson' : mode;
  const m = s.modes[kind] ?? { count: 0, score: 0 };
  s.modes[kind] = { count: m.count + 1, score: m.score + score };
  s.user.xp += xp;
  s.totals.studySeconds += durationSec;
  s.sessions = [{ mode, score, total, xp, at: now.toISOString() }, ...s.sessions].slice(0, MAX_SESSIONS);
  return touchStreak(s, todayISO(now));
}

export function weakestTopics(s, limit = 5) {
  return Object.entries(s.topics)
    .filter(([, t]) => t.errors > 0)
    .map(([topic, t]) => ({ topic, ...t, pct: Math.round((100 * (t.total - t.errors)) / t.total) }))
    .sort((a, b) => b.errors - a.errors || a.pct - b.pct)
    .slice(0, limit);
}

// ---------- Vocabulario / Spaced Repetition ----------
export function addVocab(s, { word, translation, example = '' }, level, today = todayISO()) {
  if (s.vocab[word]) return false;
  s.vocab[word] = { translation, example, level, ease: 2.5, interval: 0, reps: 0, due: today, seen: 0, wrong: 0 };
  return true;
}

export function dueCards(s, today = todayISO(), limit = 15) {
  return Object.entries(s.vocab)
    .filter(([, c]) => c.due <= today)
    .map(([word, c]) => ({ word, ...c }))
    .sort((a, b) => b.wrong - a.wrong || a.due.localeCompare(b.due))
    .slice(0, limit);
}

export function reviewCard(s, word, quality, today = todayISO()) {
  const c = s.vocab[word];
  const next = schedule(c.ease, c.interval, c.reps, quality, today);
  s.vocab[word] = {
    ...c,
    ease: next.ease,
    interval: next.interval,
    reps: next.reps,
    due: next.due,
    seen: c.seen + 1,
    wrong: c.wrong + (quality < 3 ? 1 : 0),
  };
}

export function vocabCounts(s, today = todayISO()) {
  const cards = Object.values(s.vocab);
  return {
    total: cards.length,
    due: cards.filter((c) => c.due <= today).length,
    mastered: cards.filter((c) => c.interval >= 21).length,
  };
}

export function mostFailedWords(s, limit = 5) {
  return Object.entries(s.vocab)
    .filter(([, c]) => c.wrong > 0)
    .map(([word, c]) => ({ word, translation: c.translation, wrong: c.wrong }))
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, limit);
}

// ---------- Estadísticas para logros ----------
export function achievementStats(s, today = todayISO()) {
  const lessons = Object.values(s.lessons).filter((l) => l.completedAt);
  const mode = (k) => s.modes[k] ?? { count: 0, score: 0 };
  const vocab = vocabCounts(s, today);
  const stats = {
    xp: s.user.xp,
    best_streak: s.user.bestStreak,
    lessons_done: lessons.length,
    perfect_lessons: lessons.filter((l) => l.bestScore >= 1).length,
    vocab_total: vocab.total,
    vocab_mastered: vocab.mastered,
    cards_correct: mode('review').score,
    interviews: mode('interview').count,
    writings: mode('writing').count,
    study_minutes: Math.floor(s.totals.studySeconds / 60),
  };
  for (const level of LEVELS) stats[`done_${level}`] = completedLessons(s, level).size;
  return stats;
}

export { addDays, todayISO };
