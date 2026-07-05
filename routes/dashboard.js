const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/resumen', (req, res) => {
  const operariosActivos = db.prepare('SELECT COUNT(*) AS n FROM operarios WHERE activo = 1').get().n;

  const pagos = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN importe ELSE 0 END), 0) AS pendiente_pago,
      COALESCE(SUM(CASE WHEN estado = 'pagado' AND strftime('%Y-%m', fecha_pago) = strftime('%Y-%m','now') THEN importe ELSE 0 END), 0) AS pagado_este_mes,
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS num_pendientes
    FROM pagos
  `).get();

  const cobros = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pendiente_entrega' THEN importe ELSE 0 END), 0) AS pendiente_entregar,
      COALESCE(SUM(CASE WHEN estado = 'pendiente_entrega' THEN 1 ELSE 0 END), 0) AS num_pendientes
    FROM cobros_contado
  `).get();

  const proximosPagos = db.prepare(`
    SELECT p.*, o.codigo, o.nombre, o.apellidos
    FROM pagos p JOIN operarios o ON o.id = p.operario_id
    WHERE p.estado = 'pendiente'
    ORDER BY p.fecha_prevista ASC
    LIMIT 8
  `).all();

  res.json({ operariosActivos, pagos, cobros, proximosPagos });
});

module.exports = router;
