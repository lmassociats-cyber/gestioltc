const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { operario_id, estado, desde, hasta } = req.query;
  let sql = `
    SELECT c.*, o.codigo, o.nombre, o.apellidos
    FROM cobros_contado c JOIN operarios o ON o.id = c.operario_id
    WHERE 1=1
  `;
  const params = [];

  if (operario_id) { sql += ' AND c.operario_id = ?'; params.push(operario_id); }
  if (estado) { sql += ' AND c.estado = ?'; params.push(estado); }
  if (desde) { sql += ' AND date(c.fecha_cobro) >= date(?)'; params.push(desde); }
  if (hasta) { sql += ' AND date(c.fecha_cobro) <= date(?)'; params.push(hasta); }

  sql += ' ORDER BY c.fecha_cobro DESC, c.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { operario_id, cliente, concepto, importe, fecha_cobro, observaciones } = req.body;

  if (!operario_id || !importe || !fecha_cobro) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: operario, importe y fecha de cobro.' });
  }

  const operario = db.prepare('SELECT id FROM operarios WHERE id = ?').get(operario_id);
  if (!operario) return res.status(404).json({ error: 'El operario indicado no existe.' });

  const info = db.prepare(`
    INSERT INTO cobros_contado (operario_id, cliente, concepto, importe, fecha_cobro, observaciones)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(operario_id, cliente || null, concepto || null, importe, fecha_cobro, observaciones || null);

  res.status(201).json(db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Cobro no encontrado.' });

  const d = { ...existente, ...req.body };
  db.prepare(`
    UPDATE cobros_contado SET cliente=?, concepto=?, importe=?, fecha_cobro=?, estado=?, fecha_entrega=?, observaciones=?
    WHERE id=?
  `).run(d.cliente, d.concepto, d.importe, d.fecha_cobro, d.estado, d.fecha_entrega, d.observaciones, req.params.id);

  res.json(db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(req.params.id));
});

// Marcar como entregado a caja/empresa
router.patch('/:id/entregar', (req, res) => {
  const existente = db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Cobro no encontrado.' });

  const fecha_entrega = req.body.fecha_entrega || new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE cobros_contado SET estado = 'entregado', fecha_entrega = ? WHERE id = ?").run(fecha_entrega, req.params.id);
  res.json(db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cobros_contado WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Cobro no encontrado.' });
  db.prepare('DELETE FROM cobros_contado WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
