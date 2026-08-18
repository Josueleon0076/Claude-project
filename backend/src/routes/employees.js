const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// GET /api/employees — lista todos los empleados (solo admin)
router.get('/', (req, res) => {
  const employees = db
    .prepare('SELECT id, name, email, role, active, created_at FROM employees ORDER BY name')
    .all();
  res.json({ employees });
});

// POST /api/employees — da de alta un empleado (solo admin)
router.post('/', (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'name y email son obligatorios' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM employees WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un empleado con ese correo' });
  }

  // Si no se manda contraseña, se genera una temporal que el empleado debe cambiar.
  const tempPassword = password || crypto.randomBytes(4).toString('hex');
  const passwordHash = bcrypt.hashSync(tempPassword, 10);
  const finalRole = role === 'admin' ? 'admin' : 'employee';

  const result = db
    .prepare(
      'INSERT INTO employees (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    )
    .run(name, normalizedEmail, passwordHash, finalRole);

  res.status(201).json({
    employee: {
      id: result.lastInsertRowid,
      name,
      email: normalizedEmail,
      role: finalRole,
    },
    // Solo se devuelve una vez, para que el admin se la comparta al empleado.
    temporaryPassword: password ? undefined : tempPassword,
  });
});

// PATCH /api/employees/:id — activar/desactivar o editar un empleado
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { active, name, role } = req.body || {};

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!employee) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  db.prepare(
    'UPDATE employees SET active = ?, name = ?, role = ? WHERE id = ?'
  ).run(
    active === undefined ? employee.active : active ? 1 : 0,
    name || employee.name,
    role === 'admin' || role === 'employee' ? role : employee.role,
    id
  );

  res.json({ ok: true });
});

module.exports = router;
