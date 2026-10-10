import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';
import { todayKey } from '../logic/dates';
import { dayStats, isOverdue, isSnoozed, occurrencesOn } from '../logic/occurrences';
import { useTasks } from '../store/TasksContext';
import TaskCard from '../components/TaskCard';

function StatsBar({ stats }) {
  const pct = stats.total ? stats.done / stats.total : 0;
  return (
    <View style={styles.stats}>
      <View style={styles.statsRow}>
        <Text style={styles.statsBig}>
          {stats.done}
          <Text style={styles.statsSmall}> / {stats.total} completadas</Text>
        </Text>
        <View style={{ flex: 1 }} />
        {stats.overdue > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.badgeText, { color: colors.danger }]}>{stats.overdue} vencidas</Text>
          </View>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: pct === 1 ? colors.success : colors.primary }]} />
      </View>
    </View>
  );
}

export default function DayView({ dayKey, onEdit, onQuickAdd, onSample }) {
  const { tasks, now, setDone, snooze } = useTasks();
  const [showDone, setShowDone] = useState(false);
  const [quick, setQuick] = useState('');
  const occs = useMemo(() => occurrencesOn(tasks, dayKey), [tasks, dayKey]);
  const stats = dayStats(occs, now);
  const isPast = dayKey < todayKey();

  const sections = useMemo(() => {
    const overdue = occs.filter((o) => isOverdue(o, now) && !isSnoozed(o, now));
    const upcoming = occs.filter((o) => !o.doneAt && !overdue.includes(o));
    const done = occs.filter((o) => o.doneAt);
    const out = [];
    if (overdue.length) out.push({ key: 'overdue', title: isPast ? 'No completadas' : 'Vencidas — atiéndelas ya', color: colors.danger, icon: 'alert-circle', data: overdue });
    if (upcoming.length) out.push({ key: 'todo', title: 'Por hacer', color: colors.primary, icon: 'list', data: upcoming });
    if (done.length) out.push({ key: 'done', title: `Completadas (${done.length})`, color: colors.success, icon: showDone ? 'chevron-down' : 'chevron-forward', data: showDone ? done : [], toggle: true });
    return out;
  }, [occs, now, showDone, isPast]);

  const submitQuick = () => {
    const title = quick.trim();
    if (!title) return;
    onQuickAdd(title);
    setQuick('');
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(o) => o.uid}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          {stats.total > 0 && <StatsBar stats={stats} />}
          <View style={styles.quick}>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
            <TextInput
              style={styles.quickInput}
              value={quick}
              onChangeText={setQuick}
              placeholder="Agregar actividad rápida…"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              onSubmitEditing={submitQuick}
            />
            {!!quick && (
              <Pressable onPress={submitQuick} style={styles.quickBtn}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        </>
      }
      renderSectionHeader={({ section }) => (
        <Pressable disabled={!section.toggle} onPress={() => setShowDone((v) => !v)} style={styles.sectionHeader}>
          <Ionicons name={section.icon} size={16} color={section.color} />
          <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
        </Pressable>
      )}
      renderItem={({ item }) => (
        <TaskCard
          occ={item}
          now={now}
          onToggle={(v) => setDone(item.task.id, item.key, v)}
          onPress={() => onEdit(item)}
          onLongPress={() => !item.doneAt && snooze(item.task.id, item.key, 15)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="sunny" size={56} color="#C7D2FE" />
          <Text style={styles.emptyTitle}>Sin actividades este día</Text>
          <Text style={styles.emptyText}>Usa el botón + o la barra de arriba para agregar una.</Text>
          {tasks.length === 0 && (
            <Pressable style={styles.sampleBtn} onPress={onSample}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.sampleText}>Cargar un día de ejemplo</Text>
            </Pressable>
          )}
        </View>
      }
      ListFooterComponent={
        occs.some((o) => !o.doneAt) ? (
          <Text style={styles.tip}>Consejo: mantén presionada una actividad para posponerla 15 min.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120 },
  stats: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, ...shadow },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsBig: { fontSize: 24, fontWeight: '800', color: colors.text },
  statsSmall: { fontSize: 14, fontWeight: '500', color: colors.muted },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
  },
  quickInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: colors.text },
  quickBtn: { backgroundColor: colors.primary, borderRadius: 999, padding: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sampleText: { color: colors.primary, fontWeight: '700' },
  tip: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 10 },
});
