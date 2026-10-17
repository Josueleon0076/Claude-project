// Motor de ejercicios: normalización y corrección de respuestas.
// Misma lógica que englishboost-cli/englishboost/exercises.py.

const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
  "there's": 'there is', "what's": 'what is', "let's": 'let us',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will',
  "he'll": 'he will', "she'll": 'she will', "it'll": 'it will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
  "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
  "won't": 'will not', "wouldn't": 'would not', "can't": 'cannot', "couldn't": 'could not',
  "shouldn't": 'should not', "should've": 'should have',
};

const TYPO_THRESHOLD = 0.9;

export function normalize(text) {
  const cleaned = String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?;:"()¡¿]/g, ' ');
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => CONTRACTIONS[w] ?? w)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

// Similitud estilo difflib.SequenceMatcher.ratio() aproximada con Levenshtein.
export function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

export function expectedAnswers(ex) {
  if (ex.type === 'mcq' || ex.type === 'reading') return [ex.options[ex.answer]];
  if (ex.type === 'reorder') return [ex.answer];
  return [...ex.answers];
}

/** Devuelve { correct, expected, typo }. En opción múltiple `raw` es el índice elegido. */
export function check(ex, raw) {
  const expected = expectedAnswers(ex);
  if (ex.type === 'mcq' || ex.type === 'reading') {
    const correct = typeof raw === 'number'
      ? raw === ex.answer
      : normalize(raw) === normalize(expected[0]);
    return { correct, expected: expected[0], typo: false };
  }
  const given = normalize(raw);
  const targets = expected.map(normalize);
  if (targets.includes(given)) return { correct: true, expected: expected[0], typo: false };
  // Tolerancia a typos solo en respuestas largas: en una palabra corta
  // ('is' vs 'it') una letra cambia la gramática.
  const best = Math.max(...targets.map((t) => similarity(given, t)));
  if (best >= TYPO_THRESHOLD && given.length > 12) {
    return { correct: true, expected: expected[0], typo: true };
  }
  return { correct: false, expected: expected[0], typo: false };
}

export function shuffledWords(ex, random = Math.random) {
  const original = [...ex.words];
  let words = [...original];
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    if (words.join(' ') !== original.join(' ') && words.join(' ') !== ex.answer) break;
  }
  return words;
}

/** 10 XP por acierto + 20 de bono por sesión perfecta. */
export function scoreToXp(correct, total) {
  return correct * 10 + (total && correct === total ? 20 : 0);
}

/** Tarjetas de repaso: 'to fix' también acepta 'fix'. */
export function checkCard(word, answer) {
  const answers = [word];
  if (word.startsWith('to ')) answers.push(word.slice(3));
  return check({ type: 'fill', answers }, answer);
}
