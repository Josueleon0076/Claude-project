import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, colors, ProgressBar, Screen, Subtitle } from '../components/ui';
import { LESSON_COUNTS } from '../content';
import { allAchievements, progressOf, TIERS } from '../logic/achievements';
import { achievementStats } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

export default function AchievementsScreen() {
  const { state } = useProgress();
  if (!state) return null;
  const items = allAchievements(LESSON_COUNTS);
  const stats = achievementStats(state);
  const unlocked = state.achievements;
  const categories = [...new Set(items.map((a) => a.category))];

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Text style={styles.count}>{Object.keys(unlocked).length}/{items.length}</Text>
        <Body muted>logros desbloqueados</Body>
        <View style={styles.tiers}>
          {Object.entries(TIERS).map(([tier, t]) => (
            <Body key={tier}>
              {t.medal} {items.filter((a) => a.tier === tier && unlocked[a.id]).length}/
              {items.filter((a) => a.tier === tier).length}
            </Body>
          ))}
        </View>
      </Card>

      {categories.map((category) => (
        <View key={category} style={{ gap: 8 }}>
          <Subtitle style={{ marginTop: 8 }}>{category}</Subtitle>
          {items.filter((a) => a.category === category).map((a) => {
            const date = unlocked[a.id];
            const { done, goal } = progressOf(a, stats);
            return (
              <Card key={a.id} style={[styles.item, !date && styles.locked]}>
                <Text style={styles.icon}>{date ? `${TIERS[a.tier].medal}${a.icon}` : '🔒'}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Body style={{ fontWeight: '700' }}>{a.name}</Body>
                  <Body muted style={{ fontSize: 13 }}>{a.description}</Body>
                  {date ? (
                    <Body style={{ fontSize: 13, color: colors.success }}>✓ Desbloqueado el {date.slice(0, 10)} · +{TIERS[a.tier].xp} XP</Body>
                  ) : (
                    <View style={styles.progressRow}>
                      <ProgressBar value={done} max={goal} height={6} />
                      <Text style={styles.progressText}>{done}/{goal}</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 36, fontWeight: '800', color: colors.primary },
  tiers: { flexDirection: 'row', gap: 20, marginTop: 10 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 },
  locked: { opacity: 0.75 },
  icon: { fontSize: 22, width: 68, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText: { fontSize: 12, color: colors.muted, minWidth: 44, textAlign: 'right' },
});
