import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, PRIORITIES } from '../theme';
import { fmtDayLong, fromKey, monthGrid, sameMonth, todayKey } from '../logic/dates';
import { dayStats, occurrencesOn } from '../logic/occurrences';
import { useTasks } from '../store/TasksContext';
import TaskCard from '../components/TaskCard';

const HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function MonthView({ selectedKey, onSelect, onOpenDay, onEdit }) {
  const { tasks, now, setDone } = useTasks();
  const today = todayKey();
  const grid = useMemo(() => monthGrid(selectedKey), [selectedKey]);
  const selectedOccs = occurrencesOn(tasks, selectedKey);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.calendar}>
        <View style={styles.week}>
          {HEAD.map((h, i) => (
            <Text key={i} style={styles.head}>{h}</Text>
          ))}
        </View>
        {Array.from({ length: 6 }, (_, w) => (
          <View key={w} style={styles.week}>
            {grid.slice(w * 7, w * 7 + 7).map((key) => {
              const occs = occurrencesOn(tasks, key);
              const s = dayStats(occs, now);
              const inMonth = sameMonth(key, selectedKey);
              const selected = key === selectedKey;
              const isToday = key === today;
              const allDone = s.total > 0 && s.done === s.total;
              return (
                <Pressable
                  key={key}
                  style={[styles.cell, selected && styles.selected]}
                  onPress={() => (selected ? onOpenDay(key) : onSelect(key))}
                >
                  <View style={[styles.num, isToday && styles.todayNum]}>
                    <Text
                      style={[
                        styles.numText,
                        !inMonth && { color: '#D1D5DB' },
                        isToday && { color: '#fff' },
                        selected && !isToday && { color: colors.primary },
                      ]}
                    >
                      {fromKey(key).getDate()}
                    </Text>
                  </View>
                  {s.total > 0 && inMonth && (
                    <View
                      style={[
                        styles.count,
                        { backgroundColor: s.overdue ? colors.danger : allDone ? colors.success : colors.primarySoft },
                      ]}
                    >
                      <Text style={[styles.countText, { color: s.overdue || allDone ? '#fff' : colors.primary }]}>
                        {allDone ? '✓' : s.total - s.done}
                      </Text>
                    </View>
                  )}
                  <View style={styles.dots}>
                    {inMonth &&
                      occs.slice(0, 3).map((o) => (
                        <View
                          key={o.uid}
                          style={[styles.dot, { backgroundColor: o.doneAt ? '#D1D5DB' : PRIORITIES[o.task.priority].color }]}
                        />
                      ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <Legend color={colors.danger} label="Con vencidas" />
          <Legend color={colors.primarySoft} label="Pendientes" />
          <Legend color={colors.success} label="Todo listo" />
        </View>
      </View>

      <Pressable onPress={() => onOpenDay(selectedKey)} style={styles.selHeader}>
        <Text style={styles.selTitle}>{fmtDayLong(selectedKey)}</Text>
        <Text style={styles.selLink}>Abrir día ›</Text>
      </Pressable>
      {selectedOccs.length === 0 && <Text style={styles.none}>Sin actividades.</Text>}
      {selectedOccs.map((o) => (
        <TaskCard key={o.uid} occ={o} now={now} onToggle={(v) => setDone(o.task.id, o.key, v)} onPress={() => onEdit(o)} />
      ))}
    </ScrollView>
  );
}

function Legend({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120 },
  calendar: { backgroundColor: '#fff', borderRadius: 18, padding: 8, ...shadow },
  week: { flexDirection: 'row' },
  head: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.muted, paddingVertical: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 62, borderRadius: 12 },
  selected: { backgroundColor: colors.primarySoft },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayNum: { backgroundColor: colors.primary },
  numText: { fontSize: 14, fontWeight: '700', color: colors.text },
  count: { minWidth: 20, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginTop: 2 },
  countText: { fontSize: 10, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, paddingVertical: 8 },
  selHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  selTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  selLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
  none: { color: colors.muted, textAlign: 'center', marginTop: 10 },
});
