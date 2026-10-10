import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, PRIORITIES, colors, shadow } from '../theme';
import { fmtDuration, fmtTime, fmtTimeMs } from '../logic/dates';
import { isOverdue, isSnoozed } from '../logic/occurrences';
import Checkbox from './Checkbox';

function PulsingDot({ color }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity: anim }]} />;
}

function status(occ, now) {
  if (occ.doneAt) return { text: `Completada ${fmtTimeMs(occ.doneAt)}`, color: colors.success, icon: 'checkmark-circle' };
  if (isSnoozed(occ, now)) return { text: `Pospuesta hasta ${fmtTimeMs(occ.snoozeUntil)}`, color: colors.warning, icon: 'pause-circle' };
  if (isOverdue(occ, now)) return { text: `Vencida hace ${fmtDuration(now - occ.due)}`, color: colors.danger, pulse: true };
  const left = occ.due - now;
  if (left < 60 * 60000) return { text: `En ${fmtDuration(left)}`, color: colors.primary, icon: 'time' };
  return null;
}

export default function TaskCard({ occ, now, onToggle, onPress, onLongPress, compact }) {
  const { task } = occ;
  const prio = PRIORITIES[task.priority];
  const cat = CATEGORIES[task.category] || CATEGORIES.otro;
  const st = status(occ, now);
  const overdue = !occ.doneAt && isOverdue(occ, now) && !isSnoozed(occ, now);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        overdue && styles.overdue,
        occ.doneAt && styles.done,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: occ.doneAt ? colors.border : prio.color }]} />
      <Checkbox checked={!!occ.doneAt} onChange={onToggle} color={prio.color} size={compact ? 24 : 30} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.time, overdue && { color: colors.danger }]}>{fmtTime(task.time)}</Text>
          {task.repeat !== 'none' && <Ionicons name="repeat" size={14} color={colors.muted} style={{ marginLeft: 6 }} />}
          <View style={{ flex: 1 }} />
          {!compact && (
            <View style={[styles.cat, { backgroundColor: cat.color + '18' }]}>
              <Ionicons name={cat.icon} size={12} color={cat.color} />
              <Text style={[styles.catText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, compact && { fontSize: 14 }, occ.doneAt && styles.titleDone]} numberOfLines={compact ? 1 : 2}>
          {task.title}
        </Text>
        {!compact && !!task.notes && !occ.doneAt && (
          <Text style={styles.notes} numberOfLines={1}>
            {task.notes}
          </Text>
        )}
        {st && !compact && (
          <View style={[styles.row, { marginTop: 4 }]}>
            {st.pulse ? <PulsingDot color={st.color} /> : <Ionicons name={st.icon} size={14} color={st.color} />}
            <Text style={[styles.status, { color: st.color }]}>{st.text}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow,
  },
  compact: { paddingVertical: 8, borderRadius: 12, marginBottom: 6, shadowOpacity: 0.04 },
  overdue: { borderColor: '#FCA5A5', backgroundColor: '#FFF7F7' },
  done: { opacity: 0.6 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  body: { flex: 1, marginLeft: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { fontSize: 13, fontWeight: '700', color: colors.primary },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted },
  notes: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, gap: 4 },
  catText: { fontSize: 11, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '600', marginLeft: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
