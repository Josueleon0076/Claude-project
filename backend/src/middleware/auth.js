const { verifyToken } = require('../utils/jwt');
const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de autenticación' });
  }

  try {
    const payload = verifyToken(token);
    const employee = db
      .prepare('SELECT id, name, email, role, active FROM employees WHERE id = ?')
      .get(payload.sub);

    if (!employee || !employee.active) {
      return res.status(401).json({ error: 'La cuenta ya no está activa' });
    }

    req.employee = employee;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.employee?.role !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
