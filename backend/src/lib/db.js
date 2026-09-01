import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'dashboard.db');

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
// tolerar escrituras simultáneas (varios usuarios / local + túnel): espera en vez de fallar
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS ubicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  ubicacion_id INTEGER REFERENCES ubicaciones(id),
  total_unidades REAL,
  unidad_medida TEXT NOT NULL,
  dias_planificados INTEGER DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Global'
);

CREATE TABLE IF NOT EXISTS sub_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actividad_id INTEGER REFERENCES actividades(id),
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS causas_retraso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS avances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actividad_id INTEGER REFERENCES actividades(id),
  sub_actividad_id INTEGER REFERENCES sub_actividades(id),
  fecha DATE NOT NULL,
  cantidad_realizada REAL DEFAULT 0,
  porcentaje_avance REAL DEFAULT 0,
  estado TEXT DEFAULT 'En progreso',
  observaciones TEXT,
  causa_retraso_id INTEGER REFERENCES causas_retraso(id),
  usuario_registro TEXT DEFAULT 'Sistema',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cargas_excel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archivo_nombre TEXT,
  filas_procesadas INTEGER DEFAULT 0,
  filas_errores INTEGER DEFAULT 0,
  usuario TEXT DEFAULT 'Sistema'
);

CREATE TABLE IF NOT EXISTS obra_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  codigo TEXT NOT NULL,
  grupo TEXT DEFAULT '',
  descripcion TEXT NOT NULL,
  unidad TEXT DEFAULT 'und',
  cantidad_total REAL DEFAULT 0,
  cantidad_real REAL DEFAULT 0,
  status_origen TEXT DEFAULT '',
  contratista TEXT DEFAULT '',
  dias TEXT DEFAULT '',
  dias_config TEXT DEFAULT '',
  configurado INTEGER DEFAULT 0,
  manual INTEGER DEFAULT 0,
  UNIQUE(area, codigo)
);

CREATE TABLE IF NOT EXISTS material (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  categoria TEXT DEFAULT 'GENERAL',
  material TEXT NOT NULL,
  modelo TEXT DEFAULT '',
  cantidad REAL DEFAULT 0,
  unidad TEXT DEFAULT '',
  activo INTEGER DEFAULT 1,
  UNIQUE(area, categoria, material, modelo)
);

CREATE TABLE IF NOT EXISTS obra_fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ejecutada',
  archivo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  fecha TEXT DEFAULT (date('now')),
  usuario TEXT DEFAULT 'Sistema',
  FOREIGN KEY (item_id) REFERENCES obra_items(id) ON DELETE CASCADE
);
`);

// migración para bases existentes: agrega columnas si faltan
for (const stmt of [
  'ALTER TABLE obra_items ADD COLUMN dias_config TEXT',
  'ALTER TABLE obra_items ADD COLUMN configurado INTEGER DEFAULT 0',
  'ALTER TABLE obra_items ADD COLUMN rest_inst REAL',
  'ALTER TABLE obra_items ADD COLUMN rest_conf REAL',
  "ALTER TABLE obra_items ADD COLUMN config_estado TEXT",
  'ALTER TABLE material ADD COLUMN precio_unit REAL DEFAULT 0',
  'ALTER TABLE material ADD COLUMN activo INTEGER DEFAULT 1',
]) {
  try { db.exec(stmt); } catch { /* ya existe */ }
}

db.exec(`
CREATE VIEW IF NOT EXISTS avance_actual AS
SELECT a.* FROM avances a
JOIN (
  SELECT actividad_id, COALESCE(sub_actividad_id, 0) AS sub, MAX(id) AS mid
  FROM avances GROUP BY actividad_id, COALESCE(sub_actividad_id, 0)
) t ON a.id = t.mid;
`);

export function safeGet(sql, params = []) {
  return db.prepare(sql).get(...params);
}
export function safeAll(sql, params = []) {
  return db.prepare(sql).all(...params);
}
export function safeRun(sql, params = []) {
  return db.prepare(sql).run(...params);
}
export { DB_PATH };