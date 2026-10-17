// Logros y medallas (mismas reglas que la CLI, sin los que requieren IA).

import { achievementStats, LEVELS } from './progress.js';

export const TIERS = {
  bronze: { medal: '🥉', name: 'Bronce', xp: 25 },
  silver: { medal: '🥈', name: 'Plata', xp: 50 },
  gold: { medal: '🥇', name: 'Oro', xp: 100 },
};

const LEVEL_NAMES = { 'A1-A2': 'Fundamentos', B1: 'Fluidez operacional', 'B2-C1': 'Inglés profesional / remoto' };

/** `lessonCounts` = { 'A1-A2': 8, B1: 7, 'B2-C1': 7 } */
export function allAchievements(lessonCounts) {
  const total = Object.values(lessonCounts).reduce((a, b) => a + b, 0);
  const a = (id, icon, name, description, category, tier, stat, goal) => ({
    id, icon, name, description, category, tier, stat, goal,
  });
  const medalTiers = ['bronze', 'silver', 'gold'];
  return [
    ...LEVELS.map((lvl, i) => a(
      `medal-${lvl}`, '🎖️', `Medalla ${lvl}`,
      `Completa todas las lecciones de ${lvl} (${LEVEL_NAMES[lvl]}).`,
      'Medallas de nivel', medalTiers[i], `done_${lvl}`, lessonCounts[lvl],
    )),
    a('first-lesson', '🌱', 'Primeros pasos', 'Completa tu primera lección.', 'Lecciones', 'bronze', 'lessons_done', 1),
    a('lessons-5', '📗', 'Estudiante constante', 'Completa 5 lecciones.', 'Lecciones', 'bronze', 'lessons_done', 5),
    a('lessons-12', '📚', 'Ratón de biblioteca', 'Completa 12 lecciones.', 'Lecciones', 'silver', 'lessons_done', 12),
    a('lessons-all', '🎓', 'Graduado EnglishBoost', `Completa las ${total} lecciones.`, 'Lecciones', 'gold', 'lessons_done', total),
    a('perfect-1', '💯', 'Sin errores', 'Termina una lección con 100%.', 'Precisión', 'bronze', 'perfect_lessons', 1),
    a('perfect-5', '🎯', 'Francotirador', 'Termina 5 lecciones con 100%.', 'Precisión', 'silver', 'perfect_lessons', 5),
    a('perfect-15', '🧠', 'Mente brillante', 'Termina 15 lecciones con 100%.', 'Precisión', 'gold', 'perfect_lessons', 15),
    a('streak-3', '🔥', 'En racha', 'Practica 3 días seguidos.', 'Constancia', 'bronze', 'best_streak', 3),
    a('streak-7', '⚡', 'Semana perfecta', 'Practica 7 días seguidos.', 'Constancia', 'silver', 'best_streak', 7),
    a('streak-30', '🏆', 'Imparable', 'Practica 30 días seguidos.', 'Constancia', 'gold', 'best_streak', 30),
    a('minutes-60', '⏱️', 'Primera hora', 'Estudia 60 minutos en total.', 'Constancia', 'bronze', 'study_minutes', 60),
    a('minutes-600', '⌛', 'Diez horas', 'Estudia 600 minutos en total.', 'Constancia', 'gold', 'study_minutes', 600),
    a('xp-500', '⭐', '500 XP', 'Acumula 500 puntos de experiencia.', 'Experiencia', 'bronze', 'xp', 500),
    a('xp-2000', '🌟', '2,000 XP', 'Acumula 2,000 puntos de experiencia.', 'Experiencia', 'silver', 'xp', 2000),
    a('xp-5000', '💫', '5,000 XP', 'Acumula 5,000 puntos de experiencia.', 'Experiencia', 'gold', 'xp', 5000),
    a('vocab-25', '🃏', 'Coleccionista', 'Ten 25 palabras en tu mazo de repaso.', 'Vocabulario', 'bronze', 'vocab_total', 25),
    a('cards-100', '🔁', 'Memoria de elefante', 'Acierta 100 tarjetas de repaso.', 'Vocabulario', 'silver', 'cards_correct', 100),
    a('mastered-50', '🧩', 'Vocabulario dominado', 'Domina 50 palabras (repaso cada 21+ días).', 'Vocabulario', 'gold', 'vocab_mastered', 50),
    a('interview-1', '💼', 'Primera entrevista', 'Practica una respuesta de entrevista.', 'Profesional', 'bronze', 'interviews', 1),
    a('interview-10', '🤝', 'Listo para el reclutador', 'Practica 10 entrevistas.', 'Profesional', 'silver', 'interviews', 10),
    a('writing-5', '✉️', 'Pluma profesional', 'Revisa 5 correos o mensajes.', 'Profesional', 'silver', 'writings', 5),
  ];
}

export function progressOf(achievement, stats) {
  return { done: Math.min(stats[achievement.stat] ?? 0, achievement.goal), goal: achievement.goal };
}

/**
 * Desbloquea (mutando `s`) los logros recién conseguidos y suma su XP extra.
 * Repite porque la XP de un logro puede desbloquear otro. Devuelve los nuevos.
 */
export function unlockNew(s, lessonCounts, now = new Date()) {
  const defs = allAchievements(lessonCounts);
  const newly = [];
  for (;;) {
    const stats = achievementStats(s);
    const batch = defs.filter((a) => !s.achievements[a.id] && (stats[a.stat] ?? 0) >= a.goal);
    if (!batch.length) return newly;
    for (const a of batch) {
      s.achievements[a.id] = now.toISOString();
      s.user.xp += TIERS[a.tier].xp;
    }
    newly.push(...batch);
  }
}
