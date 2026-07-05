const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'operarios.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin',
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  dni TEXT,
  telefono TEXT,
  email TEXT,
  puesto TEXT,
  tipo_pago TEXT NOT NULL DEFAULT 'mensual',
  tarifa REAL NOT NULL DEFAULT 0,
  iban TEXT,
  fecha_alta TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  notas TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operario_id INTEGER NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  periodo TEXT,
  importe REAL NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'transferencia',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha_prevista TEXT,
  fecha_pago TEXT,
  observaciones TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cobros_contado (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operario_id INTEGER NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
  cliente TEXT,
  concepto TEXT,
  importe REAL NOT NULL,
  fecha_cobro TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_entrega',
  fecha_entrega TEXT,
  observaciones TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

-- Preparadas para cuando se conecte la futura app móvil de operarios
CREATE TABLE IF NOT EXISTS fichajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operario_id INTEGER NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  hora_entrada TEXT,
  hora_salida TEXT,
  tipo TEXT DEFAULT 'normal',
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vacaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operario_id INTEGER NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  motivo TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pagos_operario ON pagos(operario_id);
CREATE INDEX IF NOT EXISTS idx_cobros_operario ON cobros_contado(operario_id);
CREATE INDEX IF NOT EXISTS idx_fichajes_operario ON fichajes(operario_id);
CREATE INDEX IF NOT EXISTS idx_vacaciones_operario ON vacaciones(operario_id);
`);

module.exports = db;
