import * as SQLite from 'expo-sqlite';

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('reloj_checador.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS records (
          id INTEGER PRIMARY KEY NOT NULL,
          client_uuid TEXT UNIQUE NOT NULL,
          employee_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0,
          server_id INTEGER
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

// Genera un id único sin depender de librerías extra.
export function generateUuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function insertLocalRecord({ clientUuid, employeeId, type, timestamp }) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO records (client_uuid, employee_id, type, timestamp, synced) VALUES (?, ?, ?, ?, 0)',
    [clientUuid, employeeId, type, timestamp]
  );
}

export async function markRecordSynced(clientUuid, serverId) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE records SET synced = 1, server_id = ? WHERE client_uuid = ?',
    [serverId, clientUuid]
  );
}

export async function getLastRecord(employeeId) {
  const db = await getDb();
  return db.getFirstAsync(
    'SELECT * FROM records WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1',
    [employeeId]
  );
}

export async function getRecords(employeeId, limit = 100) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM records WHERE employee_id = ? ORDER BY timestamp DESC LIMIT ?',
    [employeeId, limit]
  );
}

export async function getUnsyncedRecords(employeeId) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT * FROM records WHERE employee_id = ? AND synced = 0 ORDER BY timestamp ASC',
    [employeeId]
  );
}
