// Componentes visuales reutilizables y paleta de colores.

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primarySoft: '#EDE9FE',
  text: '#1F1B2E',
  muted: '#6B6780',
  border: '#E4E0F0',
  success: '#15803D',
  successSoft: '#DCFCE7',
  error: '#B91C1C',
  errorSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  gold: '#D97706',
};

export function Screen({ children, scroll = true, style }) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.screenContent, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone }) {
  const toneStyle = tone ? { backgroundColor: colors[`${tone}Soft`], borderColor: colors[tone] } : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

export function Title({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Body({ children, style, muted }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style, icon }) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: v.text }]}>{icon ? `${icon}  ` : ''}{title}</Text>
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, border: colors.primary, text: '#FFFFFF' },
  secondary: { bg: colors.card, border: colors.border, text: colors.text },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.primary },
  danger: { bg: colors.card, border: colors.error, text: colors.error },
};

/** Opción seleccionable (opción múltiple, menús). `state`: 'correct' | 'wrong' | 'selected' */
export function Option({ label, onPress, state, disabled, prefix }) {
  const tone = {
    correct: { bg: colors.successSoft, border: colors.success },
    wrong: { bg: colors.errorSoft, border: colors.error },
    selected: { bg: colors.primarySoft, border: colors.primary },
  }[state] ?? { bg: colors.card, border: colors.border };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: tone.bg, borderColor: tone.border },
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      {prefix ? <Text style={styles.optionPrefix}>{prefix}</Text> : null}
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, onPress, selected, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && { opacity: 0.35 }]}
    >
      <Text style={[styles.chipText, selected && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function Input(props) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && styles.inputMultiline, props.style]} />;
}

export function ProgressBar({ value, max, color = colors.primary, height = 8 }) {
  const pct = max ? Math.min(100, (100 * value) / max) : 0;
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Stat({ icon, value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{icon} {value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Explanation({ text, heading = '¿Por qué?' }) {
  return (
    <Card tone="warning" style={{ marginTop: 12 }}>
      <Text style={[styles.body, { fontWeight: '700', marginBottom: 4 }]}>💡 {heading}</Text>
      <Text style={styles.body}>{text}</Text>
    </Card>
  );
}

export function FeedbackList({ feedback }) {
  return (
    <Card>
      <Subtitle>📋 Puntuación orientativa: {feedback.score}/10</Subtitle>
      {feedback.good.map((g) => (
        <Body key={g} style={{ marginTop: 6 }}>✅ {g}</Body>
      ))}
      {feedback.improve.map((m) => (
        <Body key={m} style={{ marginTop: 6 }}>👉 {m}</Body>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  optionPrefix: { fontSize: 15, fontWeight: '800', color: colors.primary, minWidth: 18 },
  optionText: { fontSize: 16, color: colors.text, flexShrink: 1 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: { minHeight: 140, textAlignVertical: 'top' },
  barTrack: { backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', flex: 1 },
  barFill: { height: '100%', borderRadius: 99 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
