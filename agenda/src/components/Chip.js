import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function Chip({ label, active, onPress, color = colors.primary, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : { borderColor: colors.border }]}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? '#fff' : color} style={{ marginRight: 5 }} />}
      <Text style={[styles.text, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  text: { fontSize: 13, fontWeight: '600' },
});
