import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';
import { generateUuid, insertLocalRecord, getLastRecord } from '../db/localDb';
import { pushRecord, syncPendingRecords } from '../sync/syncRecords';

const TYPE_LABEL = { in: 'Entrada', out: 'Salida' };

export default function HomeScreen() {
  const { employee, logout } = useAuth();
  const [now, setNow] = useState(new Date());
  const [lastRecord, setLastRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const mounted = useRef(true);

  const nextType = !lastRecord || lastRecord.type === 'out' ? 'in' : 'out';
  const statusLabel = !lastRecord || lastRecord.type === 'out' ? 'Fuera' : 'Dentro';

  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const refresh = useCallback(async () => {
    const record = await getLastRecord(employee.id);
    if (mounted.current) setLastRecord(record || null);

    const { pending } = await syncPendingRecords(employee.id);
    if (mounted.current) setPendingCount(pending);
    // Si algo se sincronizó no cambia el estado local (la fuente de verdad
    // para "entrada/salida" es siempre el último registro local).
  }, [employee.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleCheck() {
    if (busy) return;
    setBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Sin lector de huella', 'Este dispositivo no tiene sensor biométrico.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert(
          'Sin huellas registradas',
          'Configura tu huella digital o Face ID en los ajustes del celular antes de checar.'
        );
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirma tu ${TYPE_LABEL[nextType].toLowerCase()}`,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!auth.success) {
        if (auth.error !== 'user_cancel') {
          Alert.alert('No se pudo verificar', 'Inténtalo de nuevo.');
        }
        return;
      }

      const clientUuid = generateUuid();
      const timestamp = new Date().toISOString();

      await insertLocalRecord({
        clientUuid,
        employeeId: employee.id,
        type: nextType,
        timestamp,
      });

      const newRecord = {
        client_uuid: clientUuid,
        employee_id: employee.id,
        type: nextType,
        timestamp,
        synced: 0,
      };
      setLastRecord(newRecord);

      const result = await pushRecord(newRecord);
      if (result.ok) {
        setPendingCount((c) => Math.max(0, c - 1));
      } else {
        setPendingCount((c) => c + 1);
      }

      Alert.alert(
        `${TYPE_LABEL[nextType]} registrada`,
        `${new Date(timestamp).toLocaleString()}${result.ok ? '' : '\n(se sincronizará cuando haya conexión)'}`
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {employee?.name?.split(' ')[0]}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.clock}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text style={styles.date}>
        {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Estado actual</Text>
        <Text style={[styles.statusValue, statusLabel === 'Dentro' && styles.statusIn]}>
          {statusLabel}
        </Text>
        {pendingCount > 0 && (
          <Text style={styles.pending}>
            {pendingCount} registro(s) pendientes de sincronizar
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.fingerprintButton, busy && styles.fingerprintButtonBusy]}
        onPress={handleCheck}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Text style={styles.fingerprintIcon}>👆</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.checkLabel}>
        Toca para registrar {TYPE_LABEL[nextType].toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#f5f6fa', paddingTop: 60, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  greeting: { fontSize: 18, fontWeight: '600' },
  logout: { color: '#dc2626', fontSize: 14 },
  clock: { fontSize: 48, fontWeight: '700', color: '#111' },
  date: { fontSize: 16, color: '#666', textTransform: 'capitalize', marginBottom: 24 },
  statusBox: { alignItems: 'center', marginBottom: 40 },
  statusLabel: { fontSize: 14, color: '#888' },
  statusValue: { fontSize: 22, fontWeight: '700', color: '#dc2626' },
  statusIn: { color: '#16a34a' },
  pending: { marginTop: 6, fontSize: 12, color: '#d97706' },
  fingerprintButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fingerprintButtonBusy: { backgroundColor: '#93c5fd' },
  fingerprintIcon: { fontSize: 64 },
  checkLabel: { marginTop: 16, fontSize: 16, color: '#333', fontWeight: '500' },
});
