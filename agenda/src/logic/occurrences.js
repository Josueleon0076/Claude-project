import { PRIORITIES } from '../theme';
import { addDays, dueMs, fromKey } from './dates';

// Una tarea puede repetirse; cada día en que aplica es una "ocurrencia".
// El estado de cada ocurrencia (completada, pospuesta, omitida) vive en
// task.occ[YYYY-MM-DD].
export function occursOn(task, key) {
  if (key < task.date) return false;
  if (task.occ?.[key]?.skipped) return false;
  switch (task.repeat) {
    case 'daily':
      return true;
    case 'weekdays': {
      const dow = fromKey(key).getDay();
      return dow >= 1 && dow <= 5;
    }
    case 'weekly':
      return fromKey(key).getDay() === fromKey(task.date).getDay();
    case 'monthly':
      return fromKey(key).getDate() === fromKey(task.date).getDate();
    default:
      return key === task.date;
  }
}

function sortOccurrences(a, b) {
  return (
    a.due - b.due ||
    PRIORITIES[a.task.priority].weight - PRIORITIES[b.task.priority].weight ||
    a.task.title.localeCompare(b.task.title)
  );
}

export function occurrencesOn(tasks, key) {
  const list = [];
  for (const task of tasks) {
    if (!occursOn(task, key)) continue;
    const state = task.occ?.[key] || {};
    list.push({
      uid: `${task.id}@${key}`,
      task,
      key,
      due: dueMs(key, task.time),
      doneAt: state.doneAt || null,
      snoozeUntil: state.snoozeUntil || null,
    });
  }
  return list.sort(sortOccurrences);
}

export function isOverdue(occ, now) {
  return !occ.doneAt && occ.due <= now;
}

export function isSnoozed(occ, now) {
  return !occ.doneAt && occ.snoozeUntil && occ.snoozeUntil > now;
}

export function dayStats(occs, now) {
  let done = 0;
  let overdue = 0;
  for (const o of occs) {
    if (o.doneAt) done++;
    else if (o.due <= now) overdue++;
  }
  return { total: occs.length, done, overdue, pending: occs.length - done };
}

// Ocurrencias sin completar que deben seguir "hostigando".
// - Tareas únicas: hasta 30 días atrás (insisten hasta que se completen).
// - Tareas que se repiten: solo la de hoy en adelante; las de días pasados
//   quedan marcadas como "no completadas" en el historial.
export function pendingForReminders(tasks, todayKey, daysAhead = 4) {
  const out = [];
  for (let i = -30; i <= daysAhead; i++) {
    const key = addDays(todayKey, i);
    for (const occ of occurrencesOn(tasks, key)) {
      if (occ.doneAt) continue;
      if (i < 0 && occ.task.repeat !== 'none') continue;
      out.push({
        ...occ,
        start: Math.max(occ.due, occ.snoozeUntil || 0),
        // Las repetitivas dejan de insistir al terminar su día.
        expiresAt: occ.task.repeat === 'none' ? Infinity : dueMs(addDays(key, 1), '00:00'),
      });
    }
  }
  return out;
}
