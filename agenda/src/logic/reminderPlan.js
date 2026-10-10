import { PRIORITIES } from '../theme';
import { fmtDuration, fmtTimeMs } from './dates';

const MIN = 60000;

// Siguiente "tick" de reloj alineado al intervalo en hora local
// (p. ej. cada 5 min → :00, :05, :10…), estrictamente después de `ms`.
export function nextTick(ms, intervalMs) {
  const offset = -new Date(ms).getTimezoneOffset() * MIN;
  const local = ms + offset;
  return (Math.floor(local / intervalMs) + 1) * intervalMs - offset;
}

const byUrgency = (a, b) =>
  PRIORITIES[a.task.priority].weight - PRIORITIES[b.task.priority].weight || a.due - b.due;

/**
 * Calcula qué notificaciones programar. Función pura (sin efectos) para
 * poder probarla.
 *
 * - Al llegar la hora de una actividad: aviso "Es hora".
 * - Después, en cada tick del intervalo (cada 5 min por defecto) se envía un
 *   aviso con TODAS las actividades vencidas sin completar, hasta que se
 *   marquen como completadas (o se pospongan).
 * - Opcional: aviso previo X minutos antes.
 *
 * Los sistemas operativos limitan cuántas notificaciones locales puede tener
 * programadas una app (iOS: 64), por eso se planea una ventana de `limit`
 * avisos y la app la vuelve a planear cada vez que se abre o cambia algo.
 */
export function planReminders(pending, { now, nagMinutes, preAlertMinutes, limit, horizonHours = 36 }) {
  const interval = nagMinutes * MIN;
  const horizon = now + horizonHours * 60 * MIN;
  const slots = new Map();
  const slot = (at) => {
    if (!slots.has(at)) slots.set(at, { at, start: [], nag: [], pre: [] });
    return slots.get(at);
  };

  for (const p of pending) {
    if (preAlertMinutes > 0 && p.start === p.due && p.due - preAlertMinutes * MIN > now) {
      slot(p.due - preAlertMinutes * MIN).pre.push(p);
    }
    if (p.start > now && p.start <= horizon) slot(p.start).start.push(p);
  }

  let t = nextTick(now, interval);
  while (t <= horizon) {
    const overdue = pending.filter((p) => p.start < t);
    if (overdue.length) {
      slot(t).nag.push(...overdue);
      if (slots.size >= limit * 2) break;
      t += interval;
    } else {
      const upcoming = pending.filter((p) => p.start >= t).map((p) => p.start);
      if (!upcoming.length) break;
      t = nextTick(Math.min(...upcoming), interval);
    }
  }

  return [...slots.values()]
    .filter((s) => s.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((s) => buildContent(s, nagMinutes));
}

function buildContent(s, nagMinutes) {
  const seen = new Set();
  const overdue = [...s.start, ...s.nag].filter((p) => !seen.has(p.uid) && seen.add(p.uid));
  overdue.sort(byUrgency);
  const pre = s.pre.filter((p) => !seen.has(p.uid));

  let title;
  let body;
  let data = {};
  let single = false;

  if (overdue.length === 1) {
    const p = overdue[0];
    const late = s.at - p.due;
    single = true;
    data = { taskId: p.task.id, key: p.key };
    if (late <= 0) {
      title = `⏰ Es hora: ${p.task.title}`;
      body = `${fmtTimeMs(p.due)} · Prioridad ${PRIORITIES[p.task.priority].label.toLowerCase()}. Te avisaré cada ${nagMinutes} min hasta que la completes.`;
    } else {
      title = `🔴 Pendiente: ${p.task.title}`;
      body = `Vencida hace ${fmtDuration(late)} (${fmtTimeMs(p.due)}). Márcala como completada para dejar de recibir este aviso.`;
    }
  } else if (overdue.length > 1) {
    title = `🔴 ${overdue.length} actividades sin completar`;
    const lines = overdue.slice(0, 5).map((p) => {
      const late = s.at - p.due;
      return `• ${p.task.title} (${late > 0 ? `hace ${fmtDuration(late)}` : 'ahora'})`;
    });
    if (overdue.length > 5) lines.push(`…y ${overdue.length - 5} más`);
    body = lines.join('\n');
  } else {
    const p = pre[0];
    title = pre.length === 1 ? `🕐 En ${fmtDuration(p.due - s.at)}: ${p.task.title}` : `🕐 ${pre.length} actividades próximas`;
    body = pre.map((x) => `• ${fmtTimeMs(x.due)} ${x.task.title}`).join('\n');
    if (pre.length === 1) {
      data = { taskId: p.task.id, key: p.key };
      single = true;
    }
  }

  if (overdue.length && pre.length) {
    body += `\nPróxima: ${pre.map((x) => x.task.title).join(', ')}`;
  }

  return { at: s.at, title, body, data, single, overdueCount: overdue.length };
}
