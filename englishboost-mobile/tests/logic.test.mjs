import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { allAchievements, unlockNew } from '../src/logic/achievements.js';
import { check, checkCard, expectedAnswers, normalize, scoreToXp, shuffledWords } from '../src/logic/exercises.js';
import { evaluateAnswer, evaluateEmail } from '../src/logic/feedback.js';
import {
  addVocab, achievementStats, completedLessons, currentStreak, dueCards, initialState, LEVELS,
  pickDailyLesson, recordAttempt, recordLesson, recordSession, reviewCard, touchStreak, weakestTopics,
} from '../src/logic/progress.js';
import { AGAIN, GOOD, schedule } from '../src/logic/srs.js';

const dataDir = new URL('../src/data/', import.meta.url);
const lessons = readdirSync(new URL('lessons/', dataDir))
  .flatMap((f) => JSON.parse(readFileSync(new URL(`lessons/${f}`, dataDir), 'utf8')));
const interview = JSON.parse(readFileSync(new URL('interview.json', dataDir), 'utf8'));
const counts = Object.fromEntries(LEVELS.map((l) => [l, lessons.filter((x) => x.level === l).length]));

test('el contenido copiado coincide con el de la CLI', () => {
  const cliDir = new URL('../../englishboost-cli/englishboost/data/lessons/', import.meta.url);
  for (const f of readdirSync(cliDir)) {
    assert.equal(
      readFileSync(new URL(`lessons/${f}`, dataDir), 'utf8'),
      readFileSync(new URL(f, cliDir), 'utf8'),
      `${f} desactualizado: ejecuta npm run sync-content`,
    );
  }
});

test('cada respuesta esperada pasa su propia corrección', () => {
  for (const lesson of lessons) {
    for (const ex of lesson.exercises) {
      const raw = ex.type === 'mcq' || ex.type === 'reading' ? ex.answer : expectedAnswers(ex)[0];
      assert.ok(check(ex, raw).correct, ex.id);
    }
  }
});

test('normalize: mayúsculas, puntuación y contracciones', () => {
  assert.equal(normalize("I'm a Developer."), normalize('i am a developer'));
  assert.equal(normalize('We’re a team!'), 'we are a team');
});

test('typos tolerados solo en respuestas largas', () => {
  const r = check({ type: 'translate', answers: ['We are a remote team'] }, 'We are a remote taem');
  assert.ok(r.correct && r.typo);
  assert.ok(!check({ type: 'fill', answers: ['is'] }, 'it').correct);
  assert.ok(checkCard('to fix', 'fix').correct);
});

test('shuffledWords conserva las palabras', () => {
  const ex = { words: ['My', 'coworker', 'is', 'nice'], answer: 'My coworker is nice' };
  assert.deepEqual([...shuffledWords(ex)].sort(), [...ex.words].sort());
  assert.equal(scoreToXp(6, 6), 80);
});

test('SM-2: los intervalos crecen y se reinician al fallar', () => {
  const s1 = schedule(2.5, 0, 0, GOOD, '2026-01-01');
  const s2 = schedule(s1.ease, s1.interval, s1.reps, GOOD, '2026-01-01');
  assert.deepEqual([s1.interval, s2.interval, s2.due], [1, 3, '2026-01-04']);
  const fail = schedule(s2.ease, s2.interval, s2.reps, AGAIN, '2026-01-01');
  assert.equal(fail.interval, 1);
  assert.ok(fail.ease >= 1.3);
});

test('racha de días consecutivos', () => {
  const s = initialState();
  assert.equal(touchStreak(s, '2026-03-10'), 1);
  assert.equal(touchStreak(s, '2026-03-10'), 1);
  assert.equal(touchStreak(s, '2026-03-11'), 2);
  assert.equal(touchStreak(s, '2026-03-20'), 1);
  assert.equal(s.user.bestStreak, 2);
  assert.equal(currentStreak(s, '2026-03-25'), 0);
});

test('lecciones: se completan con 70% y la del día avanza', () => {
  const s = initialState();
  const a1 = lessons.filter((l) => l.level === 'A1-A2').sort((a, b) => a.id.localeCompare(b.id));
  recordLesson(s, a1[0].id, 'A1-A2', 0.5);
  assert.equal(completedLessons(s).size, 0);
  assert.equal(pickDailyLesson(s, a1).id, a1[0].id);
  recordLesson(s, a1[0].id, 'A1-A2', 0.8);
  assert.equal(pickDailyLesson(s, a1).id, a1[1].id);
  assert.equal(s.lessons[a1[0].id].attempts, 2);
});

test('vocabulario y repaso', () => {
  const s = initialState();
  assert.ok(addVocab(s, { word: 'team', translation: 'equipo' }, 'A1-A2', '2026-01-01'));
  assert.ok(!addVocab(s, { word: 'team', translation: 'equipo' }, 'A1-A2', '2026-01-01'));
  assert.equal(dueCards(s, '2026-01-01').length, 1);
  reviewCard(s, 'team', AGAIN, '2026-01-01');
  assert.equal(dueCards(s, '2026-01-01').length, 0);
  assert.equal(s.vocab.team.wrong, 1);
});

test('temas débiles', () => {
  const s = initialState();
  recordAttempt(s, 'verb to be', false);
  recordAttempt(s, 'verb to be', true);
  recordAttempt(s, 'articles', true);
  assert.deepEqual(weakestTopics(s).map((t) => t.topic), ['verb to be']);
});

test('logros: se desbloquean una vez y dan XP', () => {
  const s = initialState();
  const ids = new Set(allAchievements(counts).map((a) => a.id));
  assert.equal(ids.size, allAchievements(counts).length);
  assert.deepEqual(unlockNew(s, counts), []);
  recordLesson(s, 'a1-01', 'A1-A2', 1);
  assert.deepEqual(unlockNew(s, counts).map((a) => a.id).sort(), ['first-lesson', 'perfect-1']);
  assert.equal(s.user.xp, 50);
  assert.deepEqual(unlockNew(s, counts), []);
});

test('logros: la XP extra puede encadenar otro logro', () => {
  const s = initialState();
  s.user.xp = 490;
  recordLesson(s, 'a1-01', 'A1-A2', 0.8);
  const ids = unlockNew(s, counts).map((a) => a.id);
  assert.ok(ids.includes('first-lesson') && ids.includes('xp-500'));
});

test('logros: medalla de nivel y contadores de sesiones', () => {
  const s = initialState();
  for (const l of lessons.filter((x) => x.level === 'A1-A2')) recordLesson(s, l.id, 'A1-A2', 0.9);
  recordSession(s, { mode: 'interview', score: 7, total: 10, xp: 14, durationSec: 60 });
  const stats = achievementStats(s);
  assert.equal(stats['done_A1-A2'], counts['A1-A2']);
  const ids = unlockNew(s, counts).map((a) => a.id);
  assert.ok(ids.includes('medal-A1-A2') && ids.includes('interview-1'));
});

test('feedback offline', () => {
  const q = interview.find((x) => x.id === 'int-02');
  assert.ok(evaluateAnswer(q, q.sample).score > evaluateAnswer(q, 'i fix bug').score);
  const fb = evaluateEmail('Send me the report. Actually I work at Acme!!').improve.join(' ');
  assert.ok(fb.includes('actually') && fb.includes('Could you') && fb.includes('saludo'));
});
