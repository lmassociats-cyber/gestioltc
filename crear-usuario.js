// Crea un nuevo usuario que podrá iniciar sesión en el panel.
//
// Uso:
//   node crear-usuario.js email@ejemplo.com contraseña "Nombre y Apellidos" [rol]
//
// Ejemplos:
//   node crear-usuario.js maria@tuempresa.com Clave1234! "Maria Lopez"
//   node crear-usuario.js test@ejemplo.com Test1234! "Usuario de prueba"

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const [, , email, password, nombre, rol] = process.argv;

if (!email || !password || !nombre) {
  console.log('Faltan datos. Uso correcto:');
  console.log('  node crear-usuario.js email@ejemplo.com contraseña "Nombre completo" [rol]');
  process.exit(1);
}

if (password.length < 6) {
  console.log('La contraseña debe tener al menos 6 caracteres.');
  process.exit(1);
}

const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
if (existente) {
  console.log(`Ya existe un usuario con el email ${email}. No se ha creado ninguno nuevo.`);
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
db.prepare('INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
  .run(email, hash, nombre, rol || 'admin');

console.log('Usuario creado correctamente:');
console.log(`  Email:    ${email}`);
console.log(`  Nombre:   ${nombre}`);
console.log(`  Rol:      ${rol || 'admin'}`);
console.log('Ya puede iniciar sesión en el panel con este email y esta contraseña.');
