import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, PRIORITIES, REPEATS, TEMPLATES, colors } from '../theme';
import { nextQuarter, toTime } from '../logic/dates';
import { useTasks } from '../store/TasksContext';
import Chip from './Chip';
import PickerField from './PickerField';

const empty = (date, time) => ({
  title: '',
  notes: '',
  date,
  time: time || nextQuarter(),
  priority: 'media',
  category: 'otro',
  repeat: 'none',
});

function confirm(title, message, buttons) {
  if (Platform.OS === 'web') {
    // Alert.alert con varios botones no existe en web; usamos confirm del navegador.
    const action = buttons.find((b) => b.style === 'destructive') || buttons[buttons.length - 1];
    if (window.confirm(`${title}\n${message}`)) action.onPress?.();
    return;
  }
  Alert.alert(title, message, buttons);
}

export default function TaskFormModal({ visible, editing, occKey, defaultDate, defaultTitle, onClose }) {
  const { addTask, updateTask, deleteTask, skipOccurrence } = useTasks();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(empty(defaultDate));

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      const { title, notes, date, time, priority, category, repeat } = editing;
      setForm({ title, notes, date, time, priority, category, repeat });
    } else {
      setForm({ ...empty(defaultDate), title: defaultTitle || '' });
    }
  }, [visible, editing, defaultDate, defaultTitle]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const plusMinutes = (min) => {
    const d = new Date(Date.now() + min * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    set({ time: toTime(d) });
  };

  const save = () => {
    const title = form.title.trim();
    if (!title) {
      Alert.alert('Falta el nombre', 'Escribe qué actividad hay que hacer.');
      return;
    }
    const time = /^\d{1,2}:\d{2}$/.test(form.time) ? form.time.padStart(5, '0') : null;
    if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Alert.alert('Fecha u hora inválida', 'Revisa la fecha y la hora de la actividad.');
      return;
    }
    const data = { ...form, title, time, notes: form.notes.trim() };
    if (editing) updateTask(editing.id, data);
    else addTask(data);
    onClose();
  };

  const remove = () => {
    if (editing.repeat !== 'none') {
      confirm('Eliminar actividad', 'Esta actividad se repite. ¿Qué quieres eliminar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Solo este día', onPress: () => (skipOccurrence(editing.id, occKey), onClose()) },
        { text: 'Toda la serie', style: 'destructive', onPress: () => (deleteTask(editing.id), onClose()) },
      ]);
    } else {
      confirm('Eliminar actividad', `¿Eliminar "${editing.title}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => (deleteTask(editing.id), onClose()) },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Cancelar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{editing ? 'Editar actividad' : 'Nueva actividad'}</Text>
          <Pressable onPress={save} hitSlop={10} style={styles.saveBtn}>
            <Text style={styles.saveText}>Guardar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          {!editing && (
            <>
              <Text style={styles.label}>Plantillas rápidas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {TEMPLATES.map((t) => (
                  <Chip
                    key={t.title}
                    label={t.title}
                    icon={CATEGORIES[t.category].icon}
                    color={CATEGORIES[t.category].color}
                    active={form.title === t.title}
                    onPress={() => set(t)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>¿Qué hay que hacer?</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(title) => set({ title })}
            placeholder="Ej. Arqueo de caja 3"
            placeholderTextColor="#9CA3AF"
            autoFocus={!editing && !defaultTitle}
            returnKeyType="done"
          />

          <Text style={styles.label}>Fecha y hora</Text>
          <View style={styles.rowGap}>
            <PickerField mode="date" value={form.date} onChange={(date) => set({ date })} />
            <View style={{ width: 10 }} />
            <PickerField mode="time" value={form.time} onChange={(time) => set({ time })} />
          </View>
          <View style={[styles.wrap, { marginTop: 8 }]}>
            {[15, 30, 60, 120].map((m) => (
              <Chip key={m} label={m < 60 ? `En ${m} min` : `En ${m / 60} h`} icon="flash" onPress={() => plusMinutes(m)} />
            ))}
          </View>

          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.wrap}>
            {Object.entries(PRIORITIES).map(([k, p]) => (
              <Chip key={k} label={p.label} color={p.color} icon="flag" active={form.priority === k} onPress={() => set({ priority: k })} />
            ))}
          </View>

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.wrap}>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <Chip key={k} label={c.label} color={c.color} icon={c.icon} active={form.category === k} onPress={() => set({ category: k })} />
            ))}
          </View>

          <Text style={styles.label}>Repetir</Text>
          <View style={styles.wrap}>
            {Object.entries(REPEATS).map(([k, label]) => (
              <Chip key={k} label={label} icon={k === 'none' ? undefined : 'repeat'} active={form.repeat === k} onPress={() => set({ repeat: k })} />
            ))}
          </View>
          {editing && editing.repeat !== 'none' && (
            <Text style={styles.hint}>Los cambios se aplican a todas las repeticiones de esta actividad.</Text>
          )}

          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={form.notes}
            onChangeText={(notes) => set({ notes })}
            placeholder="Detalles, montos, cajas involucradas…"
            placeholderTextColor="#9CA3AF"
            multiline
          />

          {editing && (
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Ionicons name="trash" size={18} color={colors.danger} />
              <Text style={styles.deleteText}>Eliminar actividad</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cancel: { fontSize: 16, color: colors.muted },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  rowGap: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    gap: 8,
  },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
