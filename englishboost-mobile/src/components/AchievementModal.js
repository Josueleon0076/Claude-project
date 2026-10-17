// Ventana de celebración cuando se desbloquean logros.

import { Modal, StyleSheet, Text, View } from 'react-native';

import { TIERS } from '../logic/achievements';
import { useProgress } from '../store/ProgressContext';
import { Button, colors } from './ui';

export default function AchievementModal() {
  const { newAchievements, dismissAchievements } = useProgress();
  const visible = newAchievements.length > 0;
  const xp = newAchievements.reduce((sum, a) => sum + TIERS[a.tier].xp, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissAchievements}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.party}>🎉</Text>
          <Text style={styles.heading}>
            {newAchievements.length === 1 ? '¡Nuevo logro!' : `¡${newAchievements.length} logros nuevos!`}
          </Text>
          {newAchievements.map((a) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.icon}>{TIERS[a.tier].medal}{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.desc}>{a.description}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.xp}>+{xp} XP de bonificación</Text>
          <Button title="¡Genial!" onPress={dismissAchievements} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 10, 40, 0.55)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 12 },
  party: { fontSize: 48, textAlign: 'center' },
  heading: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 26 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 14, color: colors.muted },
  xp: { fontSize: 16, fontWeight: '700', color: colors.success, textAlign: 'center' },
});
