import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Body, Button, Card, Input, Option, Screen, Subtitle, Title } from '../components/ui';
import { LEVEL_INFO, lessonsForLevel } from '../content';
import { check } from '../logic/exercises';
import { LEVELS, setProfile } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

const PER_LEVEL = 3;

function sample(list, n) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function PlacementScreen() {
  const { update } = useProgress();
  const blocks = useMemo(
    () =>
      LEVELS.map((lvl) =>
        sample(lessonsForLevel(lvl).flatMap((l) => l.exercises).filter((e) => e.type === 'mcq' || e.type === 'fill'), PER_LEVEL),
      ),
    [],
  );
  const [block, setBlock] = useState(0);
  const [q, setQ] = useState(0);
  const [hits, setHits] = useState(0);
  const [text, setText] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [result, setResult] = useState(null);

  const answer = (raw) => {
    const ok = check(blocks[block][q], raw).correct;
    const blockHits = hits + (ok ? 1 : 0);
    setText('');
    if (q + 1 < PER_LEVEL) {
      setQ(q + 1);
      setHits(blockHits);
      return;
    }
    // Fin del bloque: se aprueba con 2 de 3.
    const passed = blockHits >= 2;
    const reached = passed ? LEVELS[block] : level;
    if (passed && block + 1 < LEVELS.length) {
      setLevel(reached);
      setBlock(block + 1);
      setQ(0);
      setHits(0);
    } else {
      setResult(reached);
    }
  };

  if (result) {
    return (
      <Screen>
        <Title style={{ textAlign: 'center' }}>🧭 Resultado</Title>
        <Card tone="success">
          <Body style={{ textAlign: 'center' }}>Te recomendamos empezar en</Body>
          <Title style={{ textAlign: 'center' }}>{result}</Title>
          <Body style={{ textAlign: 'center' }}>{LEVEL_INFO[result].name}</Body>
        </Card>
        <Button
          title={`Empezar en ${result}`}
          onPress={() => {
            update((s) => {
              setProfile(s, { level: result });
              s.onboarded = true;
            });
            router.back();
          }}
        />
      </Screen>
    );
  }

  const ex = blocks[block][q];
  return (
    <Screen>
      <Body muted>Bloque {LEVELS[block]} · pregunta {q + 1}/{PER_LEVEL} · sin presión</Body>
      <Subtitle>{ex.prompt}</Subtitle>
      {ex.type === 'mcq' ? (
        ex.options.map((opt, i) => <Option key={`${ex.id}-${opt}`} prefix={String(i + 1)} label={opt} onPress={() => answer(i)} />)
      ) : (
        <>
          <Input value={text} onChangeText={setText} placeholder="Tu respuesta" autoCapitalize="none" autoCorrect={false} />
          <Button title="Siguiente" disabled={!text.trim()} onPress={() => answer(text)} />
        </>
      )}
    </Screen>
  );
}
