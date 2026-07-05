require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = process.env.ADMIN_EMAIL || 'admin@tuempresa.com';
const password = process.env.ADMIN_PASSWORD || 'cambiaEstaClave123';
const nombre = process.env.ADMIN_NOMBRE || 'Administrador';

const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);

if (existente) {
  console.log(`Ya existe un usuario con el email ${email}. No se ha creado ninguno nuevo.`);
} else {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
    .run(email, hash, nombre, 'admin');
  console.log('Usuario administrador creado correctamente:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('Cambia la contraseña después de tu primer inicio de sesión.');
}
