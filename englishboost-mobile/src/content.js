// Contenido offline compartido con la versión CLI (copiado con `npm run sync-content`).
import a1a2 from './data/lessons/a1_a2.json';
import a1a2b from './data/lessons/a1_a2_2.json';
import b1 from './data/lessons/b1.json';
import b1b from './data/lessons/b1_2.json';
import b2c1 from './data/lessons/b2_c1.json';
import b2c1b from './data/lessons/b2_c1_2.json';
import interview from './data/interview.json';
import { LEVELS } from './logic/progress.js';

export const LEVEL_INFO = {
  'A1-A2': { name: 'Fundamentos', description: 'Vocabulario base y oraciones en presente, pasado y futuro.' },
  B1: { name: 'Fluidez operacional', description: 'Tiempos perfectos, condicionales, phrasal verbs y lectura.' },
  'B2-C1': { name: 'Inglés profesional / remoto', description: 'Reuniones, correos, entrevistas y tono profesional.' },
};

export const ALL_LESSONS = [...a1a2, ...a1a2b, ...b1, ...b1b, ...b2c1, ...b2c1b].sort(
  (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id),
);

export const lessonsForLevel = (level) => ALL_LESSONS.filter((l) => l.level === level);
export const getLesson = (id) => ALL_LESSONS.find((l) => l.id === id);

export const LESSON_COUNTS = Object.fromEntries(LEVELS.map((l) => [l, lessonsForLevel(l).length]));

export const INTERVIEW_QUESTIONS = interview;

export const TYPE_LABELS = {
  mcq: 'Opción múltiple',
  reading: 'Comprensión lectora',
  translate: 'Traducción ES → EN',
  reorder: 'Ordena las palabras',
  fill: 'Completa el espacio',
};
