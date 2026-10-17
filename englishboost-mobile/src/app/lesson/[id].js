import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Exercise from '../../components/Exercise';
import { Body, Button, Card, colors, Screen, Subtitle, Title } from '../../components/ui';
import { getLesson, lessonsForLevel } from '../../content';
import { scoreToXp } from '../../logic/exercises';
import {
  addVocab, completedLessons, LESSON_PASS, LEVELS, recordAttempt, recordLesson, recordSession, setProfile,
} from '../../logic/progress';
import { useProgress } from '../../store/ProgressContext';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const lesson = getLesson(String(id));
  const { state, update } = useProgress();
  const [phase, setPhase] = useState('intro'); // intro | exercise | summary
  const [index, setIndex] = useState(0);
  const [failedTopics, setFailedTopics] = useState([]);
  const [summary, setSummary] = useState(null);
  const correctRef = useRef(0);
  const started = useRef(Date.now());

  if (!lesson || !state) return null;
  const total = lesson.exercises.length;

  const onAnswered = (result, raw) => {
    const ex = lesson.exercises[index];
    if (result.correct) correctRef.current += 1;
    else setFailedTopics((t) => [...t, ex.topic]);
    update((s) => {
      recordAttempt(s, ex.topic, result.correct);
      // Las traducciones falladas se convierten en tarjetas de repaso.
      if (!result.correct && ex.type === 'translate') {
        addVocab(s, { word: result.expected, translation: ex.prompt }, lesson.level);
      }
    });
  };

  const finish = () => {
    const correct = correctRef.current;
    const score = correct / total;
    const xp = scoreToXp(correct, total);
    const res = update((s) => {
      recordLesson(s, lesson.id, lesson.level, score);
      const newWords = lesson.vocabulary.filter((v) => addVocab(s, v, lesson.level)).length;
      const streak = recordSession(s, {
        mode: `lesson:${lesson.id}`, score: correct, total, xp,
        durationSec: Math.round((Date.now() - started.current) / 1000),
      });
      const levelIds = lessonsForLevel(lesson.level).map((l) => l.id);
      const done = completedLessons(s, lesson.level);
      const canLevelUp = s.user.level === lesson.level && lesson.level !== LEVELS.at(-1)
        && levelIds.every((lid) => done.has(lid));
      return { newWords, streak, canLevelUp };
    });
    setSummary({ correct, score, xp, ...res });
    setPhase('summary');
  };

  const next = () => (index + 1 < total ? setIndex(index + 1) : finish());

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.title_es }} />
      {phase === 'intro' && <Intro lesson={lesson} onStart={() => setPhase('exercise')} />}
      {phase === 'exercise' && (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(100 * index) / total}%` }]} />
          </View>
          <Exercise
            key={lesson.exercises[index].id}
            exercise={lesson.exercises[index]}
            index={index}
            total={total}
            onAnswered={onAnswered}
            onNext={next}
          />
        </>
      )}
      {phase === 'summary' && (
        <Summary lesson={lesson} summary={summary} failedTopics={failedTopics} total={total} update={update} />
      )}
    </Screen>
  );
}

function Intro({ lesson, onStart }) {
  return (
    <>
      <Body muted>{lesson.level} · {lesson.title}</Body>
      <Title>{lesson.title_es}</Title>
      <Card>
        <Body><Text style={{ fontWeight: '700' }}>Objetivo: </Text>{lesson.goal}</Body>
      </Card>
      <Subtitle>Vocabulario clave</Subtitle>
      {lesson.vocabulary.map((v) => (
        <Card key={v.word} style={{ paddingVertical: 12 }}>
          <Body style={{ fontWeight: '700' }}>{v.word} <Text style={{ color: colors.muted, fontWeight: '400' }}>· {v.translation}</Text></Body>
          <Body muted style={{ fontStyle: 'italic' }}>{v.example}</Body>
        </Card>
      ))}
      <Button title={`Empezar ${lesson.exercises.length} ejercicios`} onPress={onStart} />
    </>
  );
}

function Summary({ lesson, summary, failedTopics, total, update }) {
  const pct = Math.round(summary.score * 100);
  const tone = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'error';
  const [leveledUp, setLeveledUp] = useState(false);
  const nextLevel = LEVELS[LEVELS.indexOf(lesson.level) + 1];

  return (
    <>
      <Title style={{ textAlign: 'center' }}>{pct === 100 ? '¡Sesión perfecta! 🎉' : '📊 Resultado'}</Title>
      <Card tone={tone}>
        <Text style={[styles.big, { color: colors[tone] }]}>{summary.correct}/{total} ({pct}%)</Text>
        <Body style={{ textAlign: 'center' }}>+{summary.xp} XP · 🔥 {summary.streak} día(s) de racha</Body>
        <Body style={{ textAlign: 'center' }}>Palabras nuevas en tu mazo: {summary.newWords}</Body>
      </Card>
      <Card>
        <Subtitle>Palabras clave</Subtitle>
        <Body>{lesson.vocabulary.map((v) => v.word).join(', ')}</Body>
      </Card>
      {failedTopics.length > 0 && (
        <Card>
          <Subtitle>Sugerencias de mejora</Subtitle>
          {[...new Set(failedTopics)].map((t) => <Body key={t}>• Repasa: {t}</Body>)}
          <Body>• Haz el repaso de tarjetas mañana para fijar el vocabulario.</Body>
        </Card>
      )}
      {pct < LESSON_PASS * 100 && (
        <Body muted>Necesitas {LESSON_PASS * 100}% para completar la lección; volverá a aparecer como lección del día.</Body>
      )}
      {summary.canLevelUp && !leveledUp && (
        <Card tone="success">
          <Subtitle>🏆 ¡Completaste todas las lecciones de {lesson.level}!</Subtitle>
          <Button
            style={{ marginTop: 10 }}
            title={`Subir a ${nextLevel} (+100 XP)`}
            onPress={() => {
              update((s) => {
                setProfile(s, { level: nextLevel });
                s.user.xp += 100;
              });
              setLeveledUp(true);
            }}
          />
        </Card>
      )}
      {leveledUp && <Body style={{ textAlign: 'center' }}>¡Bienvenido/a a {nextLevel}! 🚀</Body>}
      <Button title="Volver al inicio" onPress={() => router.back()} />
    </>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  big: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
});
