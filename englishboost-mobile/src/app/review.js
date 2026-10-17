import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { Body, Button, Card, colors, Input, Screen, Subtitle, Title } from '../components/ui';
import { checkCard } from '../logic/exercises';
import { dueCards, recordSession, reviewCard, vocabCounts } from '../logic/progress';
import { AGAIN, GOOD, HARD } from '../logic/srs';
import { useProgress } from '../store/ProgressContext';

export default function ReviewScreen() {
  const { state, update } = useProgress();
  // La lista se fija al entrar, para que no cambie mientras repasas.
  const [cards] = useState(() => (state ? dueCards(state) : []));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(null);
  const started = useRef(Date.now());

  if (!state) return null;

  if (!cards.length) {
    const empty = vocabCounts(state).total === 0;
    return (
      <Screen>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>{empty ? '🃏' : '✅'}</Text>
        <Title style={{ textAlign: 'center' }}>{empty ? 'Aún no tienes tarjetas' : '¡Estás al día!'}</Title>
        <Body muted style={{ textAlign: 'center' }}>
          {empty
            ? 'Completa una lección para añadir vocabulario a tu mazo.'
            : 'No hay tarjetas pendientes hoy. Vuelve mañana.'}
        </Body>
        <Button title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <Title style={{ textAlign: 'center' }}>📊 Resultado del repaso</Title>
        <Card tone="success">
          <Body style={{ textAlign: 'center', fontSize: 20, fontWeight: '800' }}>
            {done.correct}/{cards.length} aciertos
          </Body>
          <Body style={{ textAlign: 'center' }}>+{done.xp} XP · 🔥 {done.streak} día(s)</Body>
        </Card>
        <Body muted>Las tarjetas falladas volverán mañana; las acertadas, en unos días.</Body>
        <Button title="Volver al inicio" onPress={() => router.back()} />
      </Screen>
    );
  }

  const card = cards[index];

  const submit = () => {
    const r = checkCard(card.word, answer);
    setResult(r);
    if (r.correct) setCorrect((c) => c + 1);
    update((s) => reviewCard(s, card.word, r.correct ? (r.typo ? HARD : GOOD) : AGAIN));
  };

  const next = () => {
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setAnswer('');
      setResult(null);
      return;
    }
    const xp = correct * 5;
    const streak = update((s) =>
      recordSession(s, {
        mode: 'review', score: correct, total: cards.length, xp,
        durationSec: Math.round((Date.now() - started.current) / 1000),
      }),
    );
    setDone({ correct, xp, streak });
  };

  return (
    <Screen>
      <Body muted>{index + 1}/{cards.length} · Escribe en inglés</Body>
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>🇪🇸 Español</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 6 }}>
          {card.translation}
        </Text>
      </Card>
      <Input
        value={answer}
        onChangeText={setAnswer}
        editable={!result}
        placeholder="🇬🇧 En inglés…"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => answer.trim() && !result && submit()}
      />
      {!result ? (
        <Button title="Comprobar" disabled={!answer.trim()} onPress={submit} />
      ) : (
        <>
          <Card tone={result.correct ? 'success' : 'error'}>
            <Subtitle style={{ color: result.correct ? colors.success : colors.error }}>
              {result.correct ? '✅ ¡Correcto!' : `❌ Era: ${card.word}`}
            </Subtitle>
            {result.typo ? <Body>Ortografía: {card.word}</Body> : null}
            {card.example ? <Body muted style={{ marginTop: 6 }}>Ejemplo: {card.example}</Body> : null}
          </Card>
          <Button title={index + 1 === cards.length ? 'Terminar' : 'Siguiente'} onPress={next} />
        </>
      )}
    </Screen>
  );
}
