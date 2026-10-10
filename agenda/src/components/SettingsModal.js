import React from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useTasks } from '../store/TasksContext';
import { sendTestNotification } from '../logic/notifications';
import Chip from './Chip';

export default function SettingsModal({ visible, onClose }) {
  const { settings, updateSettings, permission, refreshPermission } = useTasks();
  const insets = useSafeAreaInsets();
  const granted = permission === 'granted';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }]}>
          <Text style={styles.headerTitle}>Ajustes de recordatorios</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={28} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
          <View style={[styles.card, { borderColor: granted ? colors.success : colors.danger, borderWidth: 1.5 }]}>
            <View style={styles.row}>
              <Ionicons
                name={granted ? 'notifications' : 'notifications-off'}
                size={22}
                color={granted ? colors.success : colors.danger}
              />
              <Text style={styles.cardTitle}>
                {granted
                  ? 'Notificaciones activadas'
                  : permission === 'unsupported'
                    ? 'Notificaciones no disponibles en el navegador'
                    : 'Notificaciones desactivadas'}
              </Text>
            </View>
            {!granted && permission !== 'unsupported' && (
              <>
                <Text style={styles.text}>
                  Sin permiso la app no puede insistirte. Actívalas en los ajustes del teléfono.
                </Text>
                <View style={[styles.row, { marginTop: 10 }]}>
                  <Chip label="Pedir permiso" icon="refresh" onPress={refreshPermission} />
                  <Chip label="Abrir ajustes" icon="settings" onPress={() => Linking.openSettings()} />
                </View>
              </>
            )}
            {granted && <Chip label="Enviar notificación de prueba" icon="paper-plane" onPress={sendTestNotification} />}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insistir cada…</Text>
            <Text style={styles.text}>
              Mientras una actividad esté vencida y sin completar, recibirás un aviso con este intervalo.
            </Text>
            <View style={[styles.row, { flexWrap: 'wrap', marginTop: 10 }]}>
              {[5, 10, 15].map((m) => (
                <Chip key={m} label={`${m} min`} active={settings.nagMinutes === m} onPress={() => updateSettings({ nagMinutes: m })} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aviso previo</Text>
            <Text style={styles.text}>Recibe un aviso antes de la hora de cada actividad.</Text>
            <View style={[styles.row, { flexWrap: 'wrap', marginTop: 10 }]}>
              {[0, 5, 10, 15, 30].map((m) => (
                <Chip
                  key={m}
                  label={m ? `${m} min antes` : 'Sin aviso'}
                  active={settings.preAlertMinutes === m}
                  onPress={() => updateSettings({ preAlertMinutes: m })}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Para que no se pierda ningún aviso</Text>
            <Text style={styles.text}>
              • Desde la notificación puedes tocar <Text style={styles.b}>Completada</Text> o{' '}
              <Text style={styles.b}>Posponer 15 min</Text>.{'\n'}
              • El teléfono limita cuántos avisos puede dejar programados una app; abre la agenda al menos una vez
              cada pocas horas para renovarlos (cubre ~5 h en iPhone y ~12 h en Android).{'\n'}
              • En Android, permite "Alarmas y recordatorios" y quita la optimización de batería para esta app,
              así los avisos llegan a la hora exacta.{'\n'}
              • Las actividades que se repiten dejan de insistir al terminar el día; las únicas insisten hasta
              completarse.
            </Text>
          </View>
        </ScrollView>
      </View>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 0, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  b: { fontWeight: '700', color: colors.text },
});
