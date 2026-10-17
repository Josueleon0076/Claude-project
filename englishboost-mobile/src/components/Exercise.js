// Un ejercicio interactivo. Llama a `onAnswered(result, rawAnswer)` al comprobar
// y a `onNext()` cuando el usuario pulsa "Continuar".

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TYPE_LABELS } from '../content';
import { check, shuffledWords } from '../logic/exercises';
import { Body, Button, Card, Chip, colors, Explanation, Input, Option, Subtitle } from './ui';

export default function Exercise({ exercise, index, total, onAnswered, onNext }) {
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]); // índices de palabras elegidas (reorder)
  const words = useMemo(
    () => (exercise.type === 'reorder' ? shuffledWords(exercise) : []),
    [exercise],
  );

  const submit = (raw) => {
    const r = check(exercise, raw);
    setResult(r);
    onAnswered(r, String(raw));
  };

  const isChoice = exercise.type === 'mcq' || exercise.type === 'reading';
  const answered = result !== null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.meta}>
        {index + 1}/{total} · {TYPE_LABELS[exercise.type]} · {exercise.topic}
      </Text>

      {exercise.passage ? (
        <Card>
          <Body muted style={{ marginBottom: 6 }}>📄 Lee el texto</Body>
          <Body>{exercise.passage}</Body>
        </Card>
      ) : null}

      <Subtitle>{exercise.prompt ?? 'Ordena las palabras para formar una oración:'}</Subtitle>

      {isChoice &&
        exercise.options.map((opt, i) => {
          let state;
          if (answered && i === exercise.answer) state = 'correct';
          else if (answered && i === selected) state = 'wrong';
          return (
            <Option
              key={opt}
              prefix={String(i + 1)}
              label={opt}
              state={state}
              disabled={answered}
              onPress={() => {
                setSelected(i);
                submit(i);
              }}
            />
          );
        })}

      {exercise.type === 'reorder' && (
        <>
          <Card style={styles.sentence}>
            <Body style={{ fontSize: 17 }}>
              {picked.length ? picked.map((i) => words[i]).join(' ') : 'Toca las palabras en orden…'}
            </Body>
          </Card>
          <View style={styles.chips}>
            {words.map((w, i) => (
              <Chip
                key={`${w}-${i}`}
                label={w}
                selected={picked.includes(i)}
                disabled={answered}
                onPress={() =>
                  setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
                }
              />
            ))}
          </View>
          {!answered && (
            <Button
              title="Comprobar"
              disabled={picked.length !== words.length}
              onPress={() => submit(picked.map((i) => words[i]).join(' '))}
            />
          )}
        </>
      )}

      {(exercise.type === 'fill' || exercise.type === 'translate') && (
        <>
          <Input
            value={text}
            onChangeText={setText}
            editable={!answered}
            placeholder={exercise.type === 'fill' ? 'Escribe la palabra que falta' : 'Escribe la traducción en inglés'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => text.trim() && !answered && submit(text)}
          />
          {!answered && <Button title="Comprobar" disabled={!text.trim()} onPress={() => submit(text)} />}
        </>
      )}

      {answered && (
        <>
          {result.correct ? (
            <Card tone="success">
              <Body style={{ fontWeight: '700', color: colors.success }}>✅ ¡Correcto!</Body>
              {result.typo ? <Body>Ojo con la ortografía: {result.expected}</Body> : null}
            </Card>
          ) : (
            <>
              <Card tone="error">
                <Body style={{ fontWeight: '700', color: colors.error }}>❌ Respuesta correcta:</Body>
                <Body>{result.expected}</Body>
              </Card>
              <Explanation text={exercise.explanation} />
            </>
          )}
          <Button title={index + 1 === total ? 'Ver resultado' : 'Continuar'} onPress={onNext} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  sentence: { minHeight: 64, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
