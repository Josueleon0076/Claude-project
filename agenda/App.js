import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from './src/theme';
import {
  addDays,
  addMonths,
  fmtDayLong,
  fmtMonth,
  fmtWeekRange,
  nextQuarter,
  todayKey,
} from './src/logic/dates';
import { occurrencesOn } from './src/logic/occurrences';
import { TasksProvider, useTasks } from './src/store/TasksContext';
import DayView from './src/views/DayView';
import WeekView from './src/views/WeekView';
import MonthView from './src/views/MonthView';
import TaskFormModal from './src/components/TaskFormModal';
import SettingsModal from './src/components/SettingsModal';

const MODES = [
  { key: 'day', label: 'Día', icon: 'today' },
  { key: 'week', label: 'Semana', icon: 'calendar-number' },
  { key: 'month', label: 'Mes', icon: 'calendar' },
];

function Agenda() {
  const insets = useSafeAreaInsets();
  const { loaded, tasks, now, focusRequest, addTask, loadSample, permission } = useTasks();
  const [mode, setMode] = useState('day');
  const [cursor, setCursor] = useState(todayKey());
  const [form, setForm] = useState({ visible: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = todayKey();

  // Al tocar una notificación, abrir el día correspondiente.
  useEffect(() => {
    if (!focusRequest) return;
    setMode('day');
    setCursor(focusRequest.key);
  }, [focusRequest]);

  const overdueToday = useMemo(
    () => occurrencesOn(tasks, today).filter((o) => !o.doneAt && o.due <= now && !(o.snoozeUntil > now)).length,
    [tasks, today, now]
  );

  const move = (dir) => {
    if (mode === 'day') setCursor((k) => addDays(k, dir));
    else if (mode === 'week') setCursor((k) => addDays(k, dir * 7));
    else setCursor((k) => addMonths(k, dir));
  };

  const title = mode === 'day' ? fmtDayLong(cursor) : mode === 'week' ? fmtWeekRange(cursor) : fmtMonth(cursor);
  const openDay = (key) => {
    setCursor(key);
    setMode('day');
  };
  const edit = (occ) => setForm({ visible: true, editing: occ.task, occKey: occ.key });
  const quickAdd = (taskTitle) =>
    addTask({
      title: taskTitle,
      notes: '',
      date: cursor,
      time: cursor === today ? nextQuarter() : '09:00',
      priority: 'media',
      category: 'otro',
      repeat: 'none',
    });

  if (!loaded) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>Agenda de Cajas</Text>
            <Text style={styles.appSub}>{fmtDayLong(today)}</Text>
          </View>
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name={permission === 'denied' ? 'notifications-off' : 'settings-sharp'} size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.segment}>
          {MODES.map((m) => (
            <Pressable key={m.key} onPress={() => setMode(m.key)} style={[styles.segBtn, mode === m.key && styles.segActive]}>
              <Ionicons name={m.icon} size={15} color={mode === m.key ? colors.primary : '#C7D2FE'} />
              <Text style={[styles.segText, mode === m.key && { color: colors.primary }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.navRow}>
          <Pressable onPress={() => move(-1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={() => move(1)} style={styles.navBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
          {cursor !== today && (
            <Pressable onPress={() => setCursor(today)} style={styles.todayBtn}>
              <Text style={styles.todayText}>Hoy</Text>
            </Pressable>
          )}
        </View>
      </View>

      {overdueToday > 0 && !(mode === 'day' && cursor === today) && (
        <Pressable style={styles.alert} onPress={() => openDay(today)}>
          <Ionicons name="alarm" size={18} color="#fff" />
          <Text style={styles.alertText}>
            {overdueToday === 1 ? 'Tienes 1 actividad vencida hoy' : `Tienes ${overdueToday} actividades vencidas hoy`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      )}

      <View style={{ flex: 1 }}>
        {mode === 'day' && (
          <DayView dayKey={cursor} onEdit={edit} onQuickAdd={quickAdd} onSample={() => loadSample(cursor)} />
        )}
        {mode === 'week' && <WeekView anchorKey={cursor} onOpenDay={openDay} onEdit={edit} />}
        {mode === 'month' && <MonthView selectedKey={cursor} onSelect={setCursor} onOpenDay={openDay} onEdit={edit} />}
      </View>

      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 24 }, pressed && { transform: [{ scale: 0.94 }] }]}
        onPress={() => setForm({ visible: true, editing: null })}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>

      <TaskFormModal
        visible={form.visible}
        editing={form.editing}
        occKey={form.occKey}
        defaultDate={cursor}
        onClose={() => setForm({ visible: false })}
      />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TasksProvider>
        <Agenda />
      </TasksProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  appName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appSub: { color: '#C7D2FE', fontSize: 13, marginTop: 1 },
  iconBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 9, borderRadius: 12 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 4, marginTop: 14 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10 },
  segActive: { backgroundColor: '#fff' },
  segText: { color: '#E0E7FF', fontWeight: '700', fontSize: 14 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  navBtn: { padding: 4 },
  navTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  todayBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 6 },
  todayText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  alertText: { flex: 1, color: '#fff', fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 8,
  },
});
