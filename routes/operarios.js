const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function generarCodigo() {
  const ultimo = db.prepare("SELECT codigo FROM operarios ORDER BY id DESC LIMIT 1").get();
  let siguiente = 1;
  if (ultimo && ultimo.codigo) {
    const num = parseInt(ultimo.codigo.replace(/\D/g, ''), 10);
    if (!isNaN(num)) siguiente = num + 1;
  }
  return 'OP' + String(siguiente).padStart(4, '0');
}

// Listar operarios (con filtro opcional de activo/búsqueda)
router.get('/', (req, res) => {
  const { activo, q } = req.query;
  let sql = 'SELECT * FROM operarios WHERE 1=1';
  const params = [];

  if (activo === '1' || activo === '0') {
    sql += ' AND activo = ?';
    params.push(Number(activo));
  }
  if (q) {
    sql += ' AND (nombre LIKE ? OR apellidos LIKE ? OR codigo LIKE ? OR dni LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY apellidos, nombre';

  const operarios = db.prepare(sql).all(...params);
  res.json(operarios);
});

// Obtener un operario con resumen de pagos y cobros
router.get('/:id', (req, res) => {
  const operario = db.prepare('SELECT * FROM operarios WHERE id = ?').get(req.params.id);
  if (!operario) return res.status(404).json({ error: 'Operario no encontrado.' });

  const resumenPagos = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN importe ELSE 0 END), 0) AS pendiente,
      COALESCE(SUM(CASE WHEN estado = 'pagado' THEN importe ELSE 0 END), 0) AS pagado_total
    FROM pagos WHERE operario_id = ?
  `).get(req.params.id);

  const resumenCobros = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pendiente_entrega' THEN importe ELSE 0 END), 0) AS pendiente_entregar,
      COALESCE(SUM(importe), 0) AS cobrado_total
    FROM cobros_contado WHERE operario_id = ?
  `).get(req.params.id);

  res.json({ ...operario, resumenPagos, resumenCobros });
});

// Crear operario
router.post('/', (req, res) => {
  const { nombre, apellidos, dni, telefono, email, puesto, tipo_pago, tarifa, iban, fecha_alta, notas } = req.body;

  if (!nombre || !apellidos) {
    return res.status(400).json({ error: 'El nombre y los apellidos son obligatorios.' });
  }

  const codigo = generarCodigo();
  const info = db.prepare(`
    INSERT INTO operarios (codigo, nombre, apellidos, dni, telefono, email, puesto, tipo_pago, tarifa, iban, fecha_alta, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    codigo, nombre, apellidos, dni || null, telefono || null, email || null,
    puesto || null, tipo_pago || 'mensual', tarifa || 0, iban || null,
    fecha_alta || null, notas || null
  );

  const nuevo = db.prepare('SELECT * FROM operarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(nuevo);
});

// Actualizar operario
router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM operarios WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Operario no encontrado.' });

  const datos = { ...existente, ...req.body };
  db.prepare(`
    UPDATE operarios SET nombre=?, apellidos=?, dni=?, telefono=?, email=?, puesto=?,
      tipo_pago=?, tarifa=?, iban=?, fecha_alta=?, activo=?, notas=?
    WHERE id=?
  `).run(
    datos.nombre, datos.apellidos, datos.dni, datos.telefono, datos.email, datos.puesto,
    datos.tipo_pago, datos.tarifa, datos.iban, datos.fecha_alta,
    datos.activo === undefined ? existente.activo : Number(datos.activo),
    datos.notas, req.params.id
  );

  const actualizado = db.prepare('SELECT * FROM operarios WHERE id = ?').get(req.params.id);
  res.json(actualizado);
});

// Dar de baja (no se borra el histórico, se marca inactivo)
router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM operarios WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Operario no encontrado.' });

  db.prepare('UPDATE operarios SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true, mensaje: 'Operario dado de baja. Su histórico de pagos se conserva.' });
});

module.exports = router;
