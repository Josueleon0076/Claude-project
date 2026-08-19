import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getRecords } from '../db/localDb';
import { syncPendingRecords } from '../sync/syncRecords';

const TYPE_LABEL = { in: 'Entrada', out: 'Salida' };

export default function HistoryScreen() {
  const { employee } = useAuth();
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await syncPendingRecords(employee.id);
    const rows = await getRecords(employee.id);
    setRecords(rows);
  }, [employee.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.client_uuid}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Aún no tienes registros.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.badge,
                item.type === 'in' ? styles.badgeIn : styles.badgeOut,
              ]}
            >
              <Text style={styles.badgeText}>{TYPE_LABEL[item.type]}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowDate}>
                {new Date(item.timestamp).toLocaleDateString([], {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Text style={styles.rowTime}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {!item.synced && <Text style={styles.syncBadge}>Pendiente</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
  badgeIn: { backgroundColor: '#dcfce7' },
  badgeOut: { backgroundColor: '#fee2e2' },
  badgeText: { fontWeight: '600', fontSize: 12 },
  rowInfo: { flex: 1 },
  rowDate: { fontSize: 14, color: '#333', textTransform: 'capitalize' },
  rowTime: { fontSize: 18, fontWeight: '600' },
  syncBadge: { fontSize: 11, color: '#d97706' },
});
