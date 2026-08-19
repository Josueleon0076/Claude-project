const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken } = require('../utils/jwt');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }

  const employee = db
    .prepare('SELECT * FROM employees WHERE email = ?')
    .get(String(email).toLowerCase().trim());

  if (!employee || !employee.active) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = bcrypt.compareSync(password, employee.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken({ sub: employee.id, role: employee.role });

  res.json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  res.json({ employee: req.employee });
});

module.exports = router;
