import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

export default function Checkbox({ checked, onChange, color = colors.primary, size = 30 }) {
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        Haptics.notificationAsync(
          checked ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        onChange(!checked);
      }}
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 2, borderColor: checked ? colors.success : color },
        checked && { backgroundColor: colors.success },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={size * 0.65} color="#fff" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
