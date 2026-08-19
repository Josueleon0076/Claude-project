const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

function lastRecordFor(employeeId) {
  return db
    .prepare(
      'SELECT * FROM time_records WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1'
    )
    .get(employeeId);
}

// POST /api/timeclock/check
// body: { type: 'in' | 'out', clientUuid: string, biometricVerified: true }
router.post('/check', (req, res) => {
  const { type, clientUuid, biometricVerified } = req.body || {};

  if (!['in', 'out'].includes(type)) {
    return res.status(400).json({ error: "type debe ser 'in' o 'out'" });
  }

  // La huella se valida en el propio celular (BiometricPrompt / Face ID);
  // el servidor no recibe datos biométricos, solo exige que el cliente
  // confirme que el registro viene de un checado con huella verificada.
  if (biometricVerified !== true) {
    return res.status(400).json({ error: 'El registro requiere verificación biométrica' });
  }

  // Evita duplicados si la app reintenta el envío tras un corte de red.
  if (clientUuid) {
    const existing = db
      .prepare('SELECT * FROM time_records WHERE client_uuid = ?')
      .get(clientUuid);
    if (existing) {
      return res.status(200).json({ record: existing, deduplicated: true });
    }
  }

  const last = lastRecordFor(req.employee.id);
  const expectedType = !last || last.type === 'out' ? 'in' : 'out';
  if (type !== expectedType) {
    return res.status(409).json({
      error: `Se esperaba un registro de tipo "${expectedType}"`,
      expectedType,
    });
  }

  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO time_records (employee_id, type, timestamp, client_uuid) VALUES (?, ?, ?, ?)'
    )
    .run(req.employee.id, type, timestamp, clientUuid || null);

  const record = db.prepare('SELECT * FROM time_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ record });
});

// GET /api/timeclock/today — estado actual del empleado autenticado
router.get('/today', (req, res) => {
  const last = lastRecordFor(req.employee.id);
  const nextType = !last || last.type === 'out' ? 'in' : 'out';
  res.json({
    status: !last || last.type === 'out' ? 'out' : 'in',
    nextType,
    lastRecord: last || null,
  });
});

// GET /api/timeclock/history?from=&to= — historial propio
router.get('/history', (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM time_records WHERE employee_id = ?';
  const params = [req.employee.id];

  if (from) {
    query += ' AND timestamp >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND timestamp <= ?';
    params.push(to);
  }
  query += ' ORDER BY timestamp DESC LIMIT 200';

  const records = db.prepare(query).all(...params);
  res.json({ records });
});

// GET /api/timeclock/records?employeeId=&from=&to= — reporte para RR.HH.
router.get('/records', requireAdmin, (req, res) => {
  const { employeeId, from, to } = req.query;
  let query = `
    SELECT tr.*, e.name AS employee_name, e.email AS employee_email
    FROM time_records tr
    JOIN employees e ON e.id = tr.employee_id
    WHERE 1 = 1
  `;
  const params = [];

  if (employeeId) {
    query += ' AND tr.employee_id = ?';
    params.push(employeeId);
  }
  if (from) {
    query += ' AND tr.timestamp >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND tr.timestamp <= ?';
    params.push(to);
  }
  query += ' ORDER BY tr.timestamp DESC LIMIT 1000';

  const records = db.prepare(query).all(...params);
  res.json({ records });
});

// GET /api/timeclock/export?employeeId=&from=&to= — exporta CSV para RR.HH.
router.get('/export', requireAdmin, (req, res) => {
  const { employeeId, from, to } = req.query;
  let query = `
    SELECT tr.timestamp, tr.type, e.name AS employee_name, e.email AS employee_email
    FROM time_records tr
    JOIN employees e ON e.id = tr.employee_id
    WHERE 1 = 1
  `;
  const params = [];

  if (employeeId) {
    query += ' AND tr.employee_id = ?';
    params.push(employeeId);
  }
  if (from) {
    query += ' AND tr.timestamp >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND tr.timestamp <= ?';
    params.push(to);
  }
  query += ' ORDER BY tr.timestamp ASC';

  const records = db.prepare(query).all(...params);

  const header = 'empleado,correo,tipo,fecha_hora\n';
  const rows = records
    .map((r) => `${r.employee_name},${r.employee_email},${r.type},${r.timestamp}`)
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="checadas.csv"');
  res.send(header + rows);
});

module.exports = router;
