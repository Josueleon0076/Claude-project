import { StyleSheet, View } from 'react-native';

import { Body, Card, colors, ProgressBar, Screen, Stat, Subtitle } from '../components/ui';
import { LEVEL_INFO, lessonsForLevel } from '../content';
import { completedLessons, currentStreak, LEVELS, mostFailedWords, vocabCounts, weakestTopics } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

const MODE_LABELS = { review: 'Repaso', interview: 'Entrevista', writing: 'Correo' };

export default function StatsScreen() {
  const { state } = useProgress();
  if (!state) return null;
  const { user, totals } = state;
  const vocab = vocabCounts(state);
  const accuracy = totals.answered ? `${Math.round((100 * totals.correct) / totals.answered)}%` : '—';
  const weak = weakestTopics(state);
  const failed = mostFailedWords(state);

  return (
    <Screen>
      <Card>
        <View style={styles.row}>
          <Stat icon="⭐" value={user.xp} label="XP total" />
          <Stat icon="🔥" value={currentStreak(state)} label={`racha (mejor ${user.bestStreak})`} />
          <Stat icon="⏱️" value={Math.floor(totals.studySeconds / 60)} label="minutos" />
        </View>
        <View style={[styles.row, { marginTop: 14 }]}>
          <Stat icon="🎯" value={accuracy} label={`precisión (${totals.correct}/${totals.answered})`} />
          <Stat icon="🃏" value={vocab.total} label="palabras" />
          <Stat icon="🧩" value={vocab.mastered} label="dominadas" />
        </View>
      </Card>

      <Card>
        <Subtitle>Nivel actual: {user.level} · {LEVEL_INFO[user.level].name}</Subtitle>
        {LEVELS.map((lvl) => {
          const total = lessonsForLevel(lvl).length;
          const done = completedLessons(state, lvl).size;
          return (
            <View key={lvl} style={{ marginTop: 12 }}>
              <Body>{lvl} — {done}/{total} lecciones</Body>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <ProgressBar value={done} max={total} color={done === total ? colors.success : colors.primary} />
              </View>
            </View>
          );
        })}
      </Card>

      {weak.length > 0 && (
        <Card>
          <Subtitle>Temas a reforzar</Subtitle>
          {weak.map((t) => (
            <Body key={t.topic} style={{ marginTop: 6 }}>• {t.topic}: {t.errors} error(es), {t.pct}% de acierto</Body>
          ))}
        </Card>
      )}

      {failed.length > 0 && (
        <Card>
          <Subtitle>Palabras que más te cuestan</Subtitle>
          {failed.map((w) => (
            <Body key={w.word} style={{ marginTop: 6 }}>• {w.word} ({w.translation}) — {w.wrong} fallo(s)</Body>
          ))}
        </Card>
      )}

      {state.sessions.length > 0 && (
        <Card>
          <Subtitle>Últimas sesiones</Subtitle>
          {state.sessions.slice(0, 8).map((s, i) => (
            <Body key={`${s.at}-${i}`} style={{ marginTop: 6 }}>
              {s.at.slice(0, 10)} · {s.mode.startsWith('lesson:') ? `Lección ${s.mode.slice(7)}` : MODE_LABELS[s.mode] ?? s.mode}
              {' '}· {s.score}/{s.total} · +{s.xp} XP
            </Body>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' } });
