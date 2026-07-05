const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Indica el email y la contraseña.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.usuario);
});

router.post('/cambiar-password', requireAuth, (req, res) => {
  const { password_actual, password_nueva } = req.body;
  if (!password_actual || !password_nueva || password_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!bcrypt.compareSync(password_actual, usuario.password_hash)) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }

  const hash = bcrypt.hashSync(password_nueva, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, req.usuario.id);
  res.json({ ok: true });
});

module.exports = router;
