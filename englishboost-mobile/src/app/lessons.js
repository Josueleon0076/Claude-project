import { router } from 'expo-router';
import { View } from 'react-native';

import { Option, Screen, Subtitle } from '../components/ui';
import { LEVEL_INFO, lessonsForLevel } from '../content';
import { LEVELS } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

export default function LessonsScreen() {
  const { state } = useProgress();
  if (!state) return null;
  return (
    <Screen>
      {LEVELS.map((lvl) => (
        <View key={lvl} style={{ gap: 10 }}>
          <Subtitle style={{ marginTop: 8 }}>{lvl} · {LEVEL_INFO[lvl].name}</Subtitle>
          {lessonsForLevel(lvl).map((l) => {
            const p = state.lessons[l.id];
            const badge = p?.completedAt ? '✅' : p ? `${Math.round(p.bestScore * 100)}%` : '○';
            return (
              <Option
                key={l.id}
                prefix={badge}
                label={l.title_es}
                state={p?.completedAt ? 'correct' : undefined}
                onPress={() => router.push(`/lesson/${l.id}`)}
              />
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
