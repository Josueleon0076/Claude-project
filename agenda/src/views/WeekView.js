import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';
import { DAYS_LONG, fromKey, todayKey, weekKeys } from '../logic/dates';
import { dayStats, occurrencesOn } from '../logic/occurrences';
import { useTasks } from '../store/TasksContext';
import TaskCard from '../components/TaskCard';

export default function WeekView({ anchorKey, onOpenDay, onEdit }) {
  const { tasks, now, setDone } = useTasks();
  const today = todayKey();

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {weekKeys(anchorKey).map((key) => {
        const occs = occurrencesOn(tasks, key);
        const s = dayStats(occs, now);
        const d = fromKey(key);
        const isToday = key === today;
        const allDone = s.total > 0 && s.done === s.total;
        return (
          <View key={key} style={[styles.day, isToday && styles.today]}>
            <Pressable style={styles.dayHeader} onPress={() => onOpenDay(key)}>
              <View style={[styles.dateBox, isToday && { backgroundColor: colors.primary }]}>
                <Text style={[styles.dateNum, isToday && { color: '#fff' }]}>{d.getDate()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.dayName}>{DAYS_LONG[d.getDay()]}{isToday ? ' · Hoy' : ''}</Text>
                <Text style={styles.daySub}>
                  {s.total === 0 ? 'Sin actividades' : `${s.done} de ${s.total} completadas`}
                </Text>
              </View>
              {s.overdue > 0 && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>{s.overdue}</Text>
                </View>
              )}
              {allDone && <Ionicons name="checkmark-done-circle" size={22} color={colors.success} />}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: 6 }} />
            </Pressable>
            {s.total > 0 && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(s.done / s.total) * 100}%` }]} />
              </View>
            )}
            {occs.map((o) => (
              <TaskCard
                key={o.uid}
                occ={o}
                now={now}
                compact
                onToggle={(v) => setDone(o.task.id, o.key, v)}
                onPress={() => onEdit(o)}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120 },
  day: { backgroundColor: '#fff', borderRadius: 18, padding: 12, marginBottom: 12, ...shadow },
  today: { borderWidth: 2, borderColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dateNum: { fontSize: 18, fontWeight: '800', color: colors.primary },
  dayName: { fontSize: 16, fontWeight: '700', color: colors.text },
  daySub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  overdueBadge: { backgroundColor: colors.danger, borderRadius: 999, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  overdueText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  track: { height: 5, backgroundColor: colors.bg, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  fill: { height: 5, backgroundColor: colors.success },
});
