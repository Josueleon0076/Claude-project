import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, colors, Input, Option, Screen, Stat, Subtitle, Title } from '../components/ui';
import { LEVEL_INFO, lessonsForLevel } from '../content';
import { currentStreak, LEVELS, pickDailyLesson, setProfile, vocabCounts } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

export default function IndexScreen() {
  const { state } = useProgress();
  if (!state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return state.onboarded ? <Home /> : <Onboarding />;
}

function Onboarding() {
  const { update } = useProgress();
  const [name, setName] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);

  const start = () =>
    update((s) => {
      setProfile(s, { name, level });
      s.onboarded = true;
    });

  return (
    <Screen>
      <Text style={styles.hero}>👋</Text>
      <Title style={{ textAlign: 'center' }}>¡Bienvenido/a a EnglishBoost!</Title>
      <Body muted style={{ textAlign: 'center' }}>
        De A1 a inglés profesional para trabajo remoto. Sesiones de 5-10 minutos, explicaciones en
        español cuando te equivocas y repaso de lo que más te cuesta.
      </Body>
      <Subtitle>¿Cómo te llamas?</Subtitle>
      <Input value={name} onChangeText={setName} placeholder="Tu nombre" autoCapitalize="words" />
      <Subtitle>¿Desde qué nivel quieres empezar?</Subtitle>
      {LEVELS.map((lvl) => (
        <Option
          key={lvl}
          state={level === lvl ? 'selected' : undefined}
          onPress={() => setLevel(lvl)}
          label={`${lvl} — ${LEVEL_INFO[lvl].name}\n${LEVEL_INFO[lvl].description}`}
        />
      ))}
      <Button title="Empezar" icon="🚀" onPress={start} />
      <Button
        title="No sé mi nivel: hacer el test (9 preguntas)"
        variant="secondary"
        onPress={() => {
          update((s) => setProfile(s, { name }));
          router.push('/placement');
        }}
      />
    </Screen>
  );
}

function Home() {
  const { state } = useProgress();
  const { user } = state;
  const due = vocabCounts(state).due;
  const daily = pickDailyLesson(state, lessonsForLevel(user.level));
  const unlocked = Object.keys(state.achievements).length;

  return (
    <Screen>
      <Card style={styles.headerCard}>
        <Text style={styles.hello}>Hola, {user.name} 👋</Text>
        <Text style={styles.level}>
          Nivel {user.level} · {LEVEL_INFO[user.level].name}
        </Text>
        <View style={styles.statsRow}>
          <Stat icon="⭐" value={user.xp} label="XP" />
          <Stat icon="🔥" value={currentStreak(state)} label="días de racha" />
          <Stat icon="🏅" value={unlocked} label="logros" />
          <Stat icon="🃏" value={due} label="por repasar" />
        </View>
      </Card>

      <Card>
        <Body muted>Lección del día</Body>
        <Subtitle style={{ marginVertical: 4 }}>📘 {daily.title_es}</Subtitle>
        <Body muted style={{ marginBottom: 12 }}>{daily.goal}</Body>
        <Button title="Empezar lección" onPress={() => router.push(`/lesson/${daily.id}`)} />
      </Card>

      <Button
        title={`Repaso de tarjetas (${due} pendientes)`}
        icon="🃏"
        variant="secondary"
        onPress={() => router.push('/review')}
      />
      <Button title="Simulación de entrevista" icon="💼" variant="secondary" onPress={() => router.push('/interview')} />
      <Button title="Revisar correo o mensaje" icon="✉️" variant="secondary" onPress={() => router.push('/writing')} />
      <Button title="Mi progreso y estadísticas" icon="📈" variant="secondary" onPress={() => router.push('/stats')} />
      <Button title="Mis logros y medallas" icon="🏅" variant="secondary" onPress={() => router.push('/achievements')} />
      <Button title="Explorar todas las lecciones" icon="📚" variant="secondary" onPress={() => router.push('/lessons')} />
      <Button title="Ajustes" icon="⚙️" variant="ghost" onPress={() => router.push('/settings')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hero: { fontSize: 56, textAlign: 'center', marginTop: 8 },
  headerCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  hello: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  level: { fontSize: 14, color: '#E9D5FF', marginTop: 2, marginBottom: 14 },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 10 },
});
