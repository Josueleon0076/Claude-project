import { apiClient } from '../api/client';
import { getUnsyncedRecords, markRecordSynced } from '../db/localDb';

// Intenta enviar al backend un checado recién guardado localmente.
// Si falla (sin internet, servidor caído, etc.) no revienta: el registro
// se queda marcado como pendiente y se reintenta después.
export async function pushRecord(record) {
  try {
    const { data } = await apiClient.post('/timeclock/check', {
      type: record.type,
      clientUuid: record.client_uuid,
      biometricVerified: true,
    });
    await markRecordSynced(record.client_uuid, data.record.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// Reintenta enviar todos los registros pendientes de un empleado, en orden.
// Se llama al abrir la app, al volver a tener conexión y en la pantalla de
// historial, para no depender de un solo momento para sincronizar.
export async function syncPendingRecords(employeeId) {
  const pending = await getUnsyncedRecords(employeeId);
  let synced = 0;

  for (const record of pending) {
    // Se envían en orden y de uno en uno: el backend valida que las
    // entradas/salidas alternen correctamente.
    // eslint-disable-next-line no-await-in-loop
    const result = await pushRecord(record);
    if (result.ok) {
      synced += 1;
    } else {
      break; // si uno falla (p. ej. sin internet), se detiene y reintenta luego
    }
  }

  return { synced, pending: pending.length - synced };
}
