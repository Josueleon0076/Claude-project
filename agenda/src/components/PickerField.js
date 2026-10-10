import React from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../theme';
import { fmtDayLong, fmtTime, fromKey, toKey, toTime } from '../logic/dates';

// Selector de fecha (mode="date", value 'YYYY-MM-DD') u hora (mode="time", value 'HH:mm').
export default function PickerField({ mode, value, onChange }) {
  const asDate = () => {
    if (mode === 'date') return fromKey(value);
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  const emit = (d) => onChange(mode === 'date' ? toKey(d) : toTime(d));
  const icon = mode === 'date' ? 'calendar' : 'time';

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.field}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <DateTimePicker
          value={asDate()}
          mode={mode}
          display="compact"
          locale="es-MX"
          minuteInterval={mode === 'time' ? 5 : undefined}
          onChange={(_, d) => d && emit(d)}
          style={{ marginLeft: 4 }}
        />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <TextInput
          key={value}
          style={styles.webInput}
          defaultValue={value}
          placeholder={mode === 'date' ? 'AAAA-MM-DD' : 'HH:MM'}
          onEndEditing={(e) => onChange(e.nativeEvent.text)}
          onBlur={(e) => e?.nativeEvent?.text && onChange(e.nativeEvent.text)}
        />
      </View>
    );
  }

  return (
    <Pressable
      style={styles.field}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: asDate(),
          mode,
          is24Hour: false,
          onChange: (event, d) => event.type === 'set' && d && emit(d),
        })
      }
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.value}>{mode === 'date' ? fmtDayLong(value) : fmtTime(value)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    flex: 1,
  },
  value: { marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.text },
  webInput: { marginLeft: 8, fontSize: 15, flex: 1, paddingVertical: 10 },
});
