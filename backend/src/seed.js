require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const name = process.env.ADMIN_NAME || 'Administrador';
const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || 'CambiaEstaClave123';

const existing = db.prepare('SELECT id FROM employees WHERE email = ?').get(email);

if (existing) {
  console.log(`Ya existe una cuenta con el correo ${email}, no se crea de nuevo.`);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync(password, 10);
db.prepare(
  "INSERT INTO employees (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
).run(name, email, passwordHash);

console.log('Administrador creado:');
console.log(`  correo: ${email}`);
console.log(`  contraseña: ${password}`);
console.log('Cámbiala después de tu primer inicio de sesión.');
