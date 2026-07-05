const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Listar pagos con datos del operario, filtrable
router.get('/', (req, res) => {
  const { operario_id, estado, desde, hasta, concepto } = req.query;
  let sql = `
    SELECT p.*, o.codigo, o.nombre, o.apellidos
    FROM pagos p JOIN operarios o ON o.id = p.operario_id
    WHERE 1=1
  `;
  const params = [];

  if (operario_id) { sql += ' AND p.operario_id = ?'; params.push(operario_id); }
  if (estado) { sql += ' AND p.estado = ?'; params.push(estado); }
  if (concepto) { sql += ' AND p.concepto = ?'; params.push(concepto); }
  if (desde) { sql += ' AND date(p.fecha_prevista) >= date(?)'; params.push(desde); }
  if (hasta) { sql += ' AND date(p.fecha_prevista) <= date(?)'; params.push(hasta); }

  sql += ' ORDER BY p.fecha_prevista DESC, p.id DESC';
  res.json(db.prepare(sql).all(...params));
});

// Crear pago
router.post('/', (req, res) => {
  const { operario_id, concepto, periodo, importe, metodo, fecha_prevista, observaciones } = req.body;

  if (!operario_id || !concepto || !importe) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: operario, concepto e importe.' });
  }

  const operario = db.prepare('SELECT id FROM operarios WHERE id = ?').get(operario_id);
  if (!operario) return res.status(404).json({ error: 'El operario indicado no existe.' });

  const info = db.prepare(`
    INSERT INTO pagos (operario_id, concepto, periodo, importe, metodo, fecha_prevista, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(operario_id, concepto, periodo || null, importe, metodo || 'transferencia', fecha_prevista || null, observaciones || null);

  res.status(201).json(db.prepare('SELECT * FROM pagos WHERE id = ?').get(info.lastInsertRowid));
});

// Actualizar pago
router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Pago no encontrado.' });

  const d = { ...existente, ...req.body };
  db.prepare(`
    UPDATE pagos SET concepto=?, periodo=?, importe=?, metodo=?, estado=?, fecha_prevista=?, fecha_pago=?, observaciones=?
    WHERE id=?
  `).run(d.concepto, d.periodo, d.importe, d.metodo, d.estado, d.fecha_prevista, d.fecha_pago, d.observaciones, req.params.id);

  res.json(db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id));
});

// Marcar como pagado
router.patch('/:id/pagar', (req, res) => {
  const existente = db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Pago no encontrado.' });

  const fecha_pago = req.body.fecha_pago || new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE pagos SET estado = 'pagado', fecha_pago = ? WHERE id = ?").run(fecha_pago, req.params.id);
  res.json(db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id));
});

// Anular pago
router.patch('/:id/anular', (req, res) => {
  const existente = db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Pago no encontrado.' });

  db.prepare("UPDATE pagos SET estado = 'anulado' WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM pagos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Pago no encontrado.' });
  db.prepare('DELETE FROM pagos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
