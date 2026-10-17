import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Body, Button, Card, Input, Option, Screen, Subtitle } from '../components/ui';
import { LEVEL_INFO } from '../content';
import { LEVELS, setProfile } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

export default function SettingsScreen() {
  const { state, update, reset } = useProgress();
  const [name, setName] = useState(state?.user.name ?? '');
  if (!state) return null;

  const confirmReset = () =>
    Alert.alert('¿Borrar todo el progreso?', 'Se eliminarán tu XP, racha, lecciones, tarjetas y logros. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          reset();
          router.dismissAll();
        },
      },
    ]);

  return (
    <Screen>
      <Subtitle>Tu nombre</Subtitle>
      <Input value={name} onChangeText={setName} autoCapitalize="words" />
      <Button
        title="Guardar nombre"
        variant="secondary"
        disabled={!name.trim() || name.trim() === state.user.name}
        onPress={() => update((s) => setProfile(s, { name }))}
      />

      <Subtitle style={{ marginTop: 8 }}>Nivel</Subtitle>
      {LEVELS.map((lvl) => (
        <Option
          key={lvl}
          label={`${lvl} — ${LEVEL_INFO[lvl].name}`}
          state={state.user.level === lvl ? 'selected' : undefined}
          onPress={() => update((s) => setProfile(s, { level: lvl }))}
        />
      ))}
      <Button title="Repetir el test de nivel" variant="secondary" onPress={() => router.push('/placement')} />

      <Card style={{ marginTop: 8 }}>
        <Body muted>
          EnglishBoost funciona 100% offline: tu progreso se guarda solo en este teléfono. Si desinstalas
          la app, se pierde.
        </Body>
      </Card>
      <Button title="Borrar todo mi progreso" variant="danger" onPress={confirmReset} />
    </Screen>
  );
}
