// Feedback offline (heurístico) para respuestas de entrevista y correos.
// Misma lógica que englishboost-cli/englishboost/offline_feedback.py.

const SPANISH_HINTS = new Set(['pero', 'porque', 'que', 'también', 'entonces', 'trabajo', 'equipo', 'y', 'el', 'la', 'los']);
const IRREGULAR_PAST = new Set([
  'led', 'built', 'made', 'took', 'wrote', 'found', 'gave', 'went', 'did', 'had',
  'was', 'were', 'began', 'chose', 'brought', 'taught', 'thought', 'spent', 'sent', 'won',
]);
const FILLERS = ['um', 'uh', 'basically', 'stuff'];

const words = (text) => text.match(/[A-Za-zÀ-ÿ']+/g) ?? [];
const clamp = (n) => Math.max(1, Math.min(10, n));

export function evaluateAnswer(question, answer) {
  const list = words(answer);
  const lower = list.map((w) => w.toLowerCase());
  const n = list.length;
  const fb = { score: 5, good: [], improve: [] };
  const isStar = (question.category ?? '').includes('STAR');

  if (n < 25) {
    fb.score -= 2;
    fb.improve.push(`Tu respuesta es muy corta (${n} palabras). Apunta a 60-150 palabras para dar contexto y resultados.`);
  } else if (n > 220) {
    fb.score -= 1;
    fb.improve.push(`Es bastante larga (${n} palabras). En entrevistas, sé conciso: 1-2 minutos por respuesta.`);
  } else {
    fb.score += 1;
    fb.good.push(`Buena longitud (${n} palabras).`);
  }

  const hits = (question.keywords ?? []).filter((k) => answer.toLowerCase().includes(k.toLowerCase()));
  if (hits.length >= 2) {
    fb.score += 1;
    fb.good.push('Incluyes ideas clave esperadas para esta pregunta.');
  } else {
    fb.improve.push('Revisa el consejo de la pregunta: faltan ideas clave que el entrevistador espera escuchar.');
  }

  if (/\d/.test(answer)) {
    fb.score += 1;
    fb.good.push('Usas números/datos concretos. ¡Eso da credibilidad!');
  } else if (isStar) {
    fb.improve.push("Añade un resultado medible: 'reduced costs by 20%', 'saved 5 hours a week'.");
  }

  if (isStar) {
    const past = lower.filter((w) => w.endsWith('ed') || IRREGULAR_PAST.has(w));
    if (past.length >= 3) {
      fb.score += 1;
      fb.good.push('Narras en pasado simple, como pide una historia STAR.');
    } else {
      fb.improve.push("Las historias STAR se cuentan en pasado simple: 'I led', 'I built', 'we reduced'.");
    }
    const count = (w) => lower.filter((x) => x === w).length;
    if (count('we') > count('i')) {
      fb.improve.push("Usas más 'we' que 'I'. El entrevistador quiere saber qué hiciste TÚ.");
    }
  }

  if (/(^|\s)i(\s|')/.test(answer)) {
    fb.score -= 1;
    fb.improve.push("El pronombre 'I' (yo) siempre va en mayúscula, incluso en medio de la oración.");
  }

  const spanish = new Set(lower.filter((w) => SPANISH_HINTS.has(w)));
  if (spanish.size >= 2) {
    fb.score -= 1;
    fb.improve.push('Parece que mezclaste palabras en español. Intenta mantenerte en inglés aunque sea con frases simples.');
  }

  const fillers = FILLERS.filter((f) => lower.includes(f));
  if (fillers.length) fb.improve.push(`Evita muletillas o palabras vagas: ${fillers.join(', ')}.`);

  fb.score = clamp(fb.score);
  return fb;
}

export function evaluateEmail(text) {
  const lower = text.toLowerCase();
  const fb = { score: 6, good: [], improve: [] };

  if (/^\s*(hi|hello|dear|good (morning|afternoon))\b/.test(lower)) {
    fb.good.push('Abres con un saludo adecuado.');
  } else {
    fb.score -= 1;
    fb.improve.push("Empieza con un saludo: 'Hi Sarah,' o 'Dear Mr. Smith,' (formal).");
  }

  if (/(best regards|kind regards|best,|thanks|thank you|sincerely|cheers)/.test(lower)) {
    fb.good.push('Cierras de forma profesional.');
  } else {
    fb.score -= 1;
    fb.improve.push("Añade un cierre: 'Best regards,' / 'Thanks,' + tu nombre.");
  }

  if (/(could you|would you|please|i was wondering)/.test(lower)) {
    fb.score += 1;
    fb.good.push('Usas fórmulas corteses (please / could you).');
  } else if (/(^|[.!?,]\s+)(send|give|tell|do|make|fix)\b/m.test(lower)) {
    fb.score -= 1;
    fb.improve.push("Hay imperativos directos ('Send me...'). Suaviza con 'Could you please send me...?'.");
  }

  if (lower.includes('actually')) {
    fb.improve.push("Ojo con 'actually': significa 'en realidad', no 'actualmente' (= 'currently').");
  }
  if (/(^|\s)i(\s|')/.test(text)) {
    fb.score -= 1;
    fb.improve.push("El pronombre 'I' siempre va en mayúscula.");
  }
  if (text.includes('!!') || /\b[A-Z]{5,}\b/.test(text)) {
    fb.score -= 1;
    fb.improve.push("Evita '!!' y las MAYÚSCULAS: en inglés se perciben como gritar.");
  }
  if (words(text).length > 200) {
    fb.improve.push('El mensaje es largo. Los correos efectivos van al grano: 3-5 frases si es posible.');
  }
  if (/\b(wanna|gonna|u|pls|thx)\b/.test(lower)) {
    fb.score -= 1;
    fb.improve.push('Evita abreviaturas informales (gonna, pls, thx, u) en mensajes profesionales.');
  }

  fb.score = clamp(fb.score);
  return fb;
}
