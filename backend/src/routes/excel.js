import { Router } from 'express';
import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'uploads.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
  try { fs.appendFileSync(LOG_PATH, line + '\n'); } catch { /* noop */ }
}

const router = Router();

const UBIC_MAP = { COSC: 'COSC', PAR: 'PAR', EXT: 'EXT', 'PLANTA EXTERNA': 'EXT', 'EXTERNA': 'EXT' };
const ESTADOS = ['En progreso', 'Completado', 'Pausado', 'Con retraso'];

function catalogoActividades() {
  return db.prepare('SELECT codigo, id, nombre FROM actividades').all().reduce((m, r) => (m.set(r.codigo, r.id), m), new Map());
}
function catalogoSubs() {
  return db.prepare('SELECT id, actividad_id, nombre FROM sub_actividades').all();
}

function normalizeHeader(h) {
  return String(h).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Sinónimos de nombres de columnas (normalizados sin acentos/símbolos)
const ALIASES = {
  fecha: ['fecha', 'date', 'dia', 'fecharegistro'],
  ubicacion: ['ubicacion', 'planta', 'locacion', 'lugar', 'sede'],
  actividad: ['actividad', 'sistema', 'sist', 'codigo', 'codigoactividad', 'actividades'],
  subactividad: ['subactividad', 'subactividades', 'tfase', 'etapa', 'componente'],
  cantidad: ['cantidad', 'cant', 'unidades', 'n', 'qty', 'cantidadrealizada', 'metros'],
  avance: ['avance', 'porcentaje', 'pct', 'porcentajeavance', 'avancereal', 'porcentodeavance'],
  estado: ['estado', 'status', 'situacion'],
  observaciones: ['observaciones', 'observacion', 'nota', 'notas', 'comentario', 'comentarios'],
  causa: ['causa', 'motivo', 'causaesde', 'razon', 'ponchodecausa'],
};

function canonicalOf(norm) {
  for (const [key, list] of Object.entries(ALIASES)) {
    if (list.includes(norm)) return key;
  }
  return null;
}

function scoreHeaders(headers) {
  const keys = new Set(headers.map((h) => canonicalOf(normalizeHeader(h))).filter(Boolean));
  return keys.size;
}

// Convierte la fila de encabezado + columnas a objetos por columna (claves canónicas)
function buildObjects(headerRow, aoa) {
  const cols = [];
  headerRow.forEach((h, i) => {
    const c = canonicalOf(normalizeHeader(h));
    if (c) cols.push([c, i]);
  });
  const data = [];
  for (const row of aoa) {
    if (!row || row.every((c) => c === undefined || String(c).trim() === '')) continue;
    const obj = {};
    for (const [key, i] of cols) obj[key] = row[i] ?? '';
    data.push(obj);
  }
  return data;
}

// Parsea TODAS las pestañas de un workbook y detecta la columna de encabezados.
function procesarWorkbook(wb, buf, detalle) {
  const todas = [];
  const sheets = [];
  let aciertos = 0;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    let aoa = [];
    try {
      aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', cellDates: true });
    } catch (e) {
      sheets.push({ nombre: name, filas: 0, esAvances: false, columnas: [], error: String(e.message || e) });
      continue;
    }
    if (!aoa || aoa.length === 0) {
      sheets.push({ nombre: name, filas: 0, esAvances: false, columnas: [] });
      continue;
    }

    // detectar fila con más coincidencias con las columnas esperadas
    let bestIdx = -1, bestScore = 0;
    for (let i = 0; i < aoa.length; i++) {
      const score = scoreHeaders(aoa[i].map(String));
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    const headerRow = bestIdx >= 0 ? aoa[bestIdx].map(String) : [];
    const esAvances = bestScore >= 3;
    const colCount = headerRow.reduce((n, h) => n + (canonicalOf(normalizeHeader(h)) ? 1 : 0), 0);
    aciertos += bestScore;
    sheets.push({
      nombre: name,
      filas: aoa.length,
      esAvances,
      columnas: headerRow.slice(0, 15).map((h) => ({ nombre: h, campo: canonicalOf(normalizeHeader(h)) })),
    });
    if (!esAvances) continue;

    const data = buildObjects(headerRow, aoa.slice(bestIdx + 1));
    for (const r of data) {
      todas.push({
        hoja: name,
        fecha: r.fecha ?? null,
        ubicacion: r.ubicacion ?? null,
        actividad: r.actividad ?? null,
        sub_actividad: r.subactividad ?? null,
        cantidad: r.cantidad ?? null,
        pct: r.avance ?? r.porcentaje ?? r.pct ?? null,
        estado: r.estado ?? null,
        observaciones: r.observaciones ?? null,
        causa: r.causa ?? null,
      });
    }
  }
  return { filas: todas, sheets, aciertos, tecnico: { detalle, bytes: buf.length, hojas: wb.SheetNames } };
}

// Parsea con varias estrategias y se queda con la que más columnas coincida (evita
// que el lector corrompa los acentos en CSV, donde SheetJS usa CP1252 por defecto).
// Detecta contenido binario (XLSX/XLS/ODS = ZIP/BIFF). Leer binarios como texto
// puede colgar a SheetJS infinitamente, así que la estrategia "texto" solo se usa
// en archivos de texto (CSV/TSV).
function esBinario(buf) {
  if (!buf || buf.length < 2) return false;
  // ZIP (xlsx/ods): PK\x03\x04 / PK\x05\x06 / PK\x07\x08  |  BIFF (xls): D0 CF 11 E0
  return (buf[0] === 0x50 && (buf[1] === 0x4b))
    || (buf[0] === 0xd0 && buf[1] === 0xcf);
}

function parseWorkbook(buf) {
  const candidatos = [];
  const binario = esBinario(buf);
  // 1) binario (correcto para .xlsx/.xls/.ods)
  try {
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    if (wb && wb.SheetNames && wb.SheetNames.length > 0) candidatos.push(procesarWorkbook(wb, buf, 'buffer'));
  } catch { /* sigue */ }
  // 2) como texto UTF-8 (solo CSV/TSV con acentos, NO en binarios que cuelgan a SheetJS)
  if (!binario) {
    try {
      const texto = buf.toString('utf8').replace(/^\uFEFF/, '');
      const wb = XLSX.read(texto, { type: 'string', cellDates: true });
      if (wb && wb.SheetNames && wb.SheetNames.length > 0) candidatos.push(procesarWorkbook(wb, buf, 'texto'));
    } catch { /* sigue */ }
  }

  if (candidatos.length === 0) {
    return { filas: [], sheets: [], tecnico: { detalle: 'no_se_pudo', bytes: buf.length, hojas: [] }, aciertos: 0 };
  }
  // priorizar el que detectó más filas, luego más aciertos de columnas, luego buffer
  candidatos.sort((a, b) => (b.filas.length - a.filas.length) || (b.aciertos - a.aciertos));
  return candidatos[0];
}

function validarFila(r) {
  const errors = [];
  const ACTS = catalogoActividades();
  const SUBS = catalogoSubs();

  let fecha = null;
  if (r.fecha) {
    if (r.fecha instanceof Date) fecha = r.fecha.toISOString().slice(0, 10);
    else {
      const d = new Date(String(r.fecha));
      if (isNaN(d)) errors.push('Fecha inválida');
      else fecha = d.toISOString().slice(0, 10);
    }
  }

  const ubicacion = r.ubicacion ? UBIC_MAP[String(r.ubicacion).toUpperCase().trim()] : null;
  if (!ubicacion) errors.push('Ubicación no reconocida');

  const keyAct = r.actividad ? String(r.actividad).trim().toUpperCase() : null;
  let actividadId = keyAct ? ACTS.get(keyAct) : null;
  if (!actividadId && r.actividad) {
    const byName = db.prepare('SELECT id FROM actividades WHERE nombre=?').get(String(r.actividad).trim());
    actividadId = byName ? byName.id : null;
  }
  if (!actividadId) errors.push('Actividad inexistente en catálogo');

  let pct = null;
  if (r.pct !== null && r.pct !== '' && r.pct !== undefined) {
    pct = Number(String(r.pct).replace(/%/g, '').replace(',', '.'));
    if (isNaN(pct) || pct < 0 || pct > 100) { errors.push('% Avance fuera de rango (0-100)'); pct = null; }
  } else errors.push('Falta % avance');

  if (r.estado && !ESTADOS.includes(String(r.estado).trim())) errors.push('Estado inválido');

  let subId = null;
  if (r.sub_actividad && actividadId) {
    const sub = SUBS.find((s) => s.actividad_id === actividadId && String(s.nombre).toLowerCase() === String(r.sub_actividad).trim().toLowerCase());
    if (sub) subId = sub.id;
  }

  const dup = (fecha && actividadId) ? db.prepare(
    'SELECT id FROM avances WHERE actividad_id=? AND COALESCE(sub_actividad_id,0)=? AND fecha=?'
  ).get(actividadId, subId || 0, fecha) : null;
  if (dup) errors.push('Registro duplicado (misma actividad y fecha)');

  return { hoja: r.hoja, nro: r.nro, fecha, ubicacion, actividad_codigo: keyAct, actividad_id: actividadId, sub_actividad_id: subId, sub_actividad: r.sub_actividad, cantidad: r.cantidad, pct, estado: r.estado, observaciones: r.observaciones, causa: r.causa, errors };
}

// =====================================================================
// Importador de libros de seguimiento de Planta Externa (DATOS 13M/9M/BOTONES)
// =====================================================================
function isDone(v) {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  if (s === '') return false;
  const low = s.toLowerCase();
  if (['completado', 'terminado', 'izado completo', 'si', 'ok'].includes(low)) return true;
  const n = Number(s);
  return !isNaN(n) && n === 1;
}
function cellNum(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(String(v).trim().replace(/%/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}
function findHeaderRow(aoa, needleSet, requirePct = false) {
  let best = -1, bestScore = 0;
  for (let i = 0; i < Math.min(aoa.length, 4); i++) {
    const cells = aoa[i].map((c) => String(c).trim().toUpperCase());
    const hits = needleSet.filter((n) => cells.includes(n) || cells.some((c) => c.includes(n)));
    const hasPct = cells.some((c) => c.includes('% AVANCE'));
    if (hits.length >= 2 && hits.length > bestScore && (!requirePct || hasPct)) { best = i; bestScore = hits.length; }
  }
  if (best < 0 && requirePct) {
    for (let i = 0; i < Math.min(aoa.length, 4); i++) {
      const cells = aoa[i].map((c) => String(c).trim().toUpperCase());
      const hits = needleSet.filter((n) => cells.includes(n) || cells.some((c) => c.includes(n)));
      if (hits.length >= 2 && hits.length > bestScore) { best = i; bestScore = hits.length; }
    }
  }
  return best;
}
function agregaPct(r, pctFrac, extra) {
  const pct = pctFrac === null ? 0 : pctFrac;
  r.sum += pct;
  r.total++;
  if (pct >= 1) r.completos++;
  if (extra && extra.done) r[extra.key] = (r[extra.key] || 0) + 1;
}

// Libro1: postes de 13 metros -> PE-01 (postes), PE-03 (pozos/POZO), PE-07 (cámaras/CAMARA)
function mapDatos13M(aoa) {
  const hr = findHeaderRow(aoa, ['IZAJE', 'POZO', 'CAMARA', 'RESANE', 'CAJA']);
  if (hr < 0) return null;
  const h = aoa[hr].map((c) => String(c).trim().toUpperCase());
  const idx = {};
  for (const k of ['IZAJE', 'POZO', 'CAMARA', 'RESANE', 'CAJA']) idx[k] = h.findIndex((c) => c === k);
  if (Object.values(idx).every((i) => i < 0)) return null;
  let suma = 0, total = 0, completos = 0, pozos = 0, camaras = 0;
  for (let i = hr + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || (String(r[0] || '').trim() === '' && String(r[idx.IZAJE < 0 ? 1 : idx.IZAJE] || '').trim() === '')) continue;
    const tareas = ['IZAJE', 'POZO', 'CAMARA', 'RESANE', 'CAJA'].filter((k) => idx[k] >= 0).map((k) => isDone(r[idx[k]]));
    if (tareas.length === 0) continue;
    const hechas = tareas.filter(Boolean).length;
    suma += hechas / tareas.length;
    total++;
    if (hechas === tareas.length) completos++;
    if (idx.POZO >= 0 && isDone(r[idx.POZO])) pozos++;
    if (idx.CAMARA >= 0 && isDone(r[idx.CAMARA])) camaras++;
  }
  if (total === 0) return null;
  const acts = {
    'PE-01': { pct: Math.round((100 * suma) / total), cantidad: completos, totalUnidades: total },
    'PE-03': { pct: Math.round((100 * pozos) / total), cantidad: pozos, totalUnidades: total },
    'PE-07': { pct: Math.round((100 * camaras) / total), cantidad: camaras, totalUnidades: total },
  };
  return { actividades: acts, filas: total, detalle: 'postes 13m' };
}

// Libro2: postes de 9 metros -> PE-02 (columna % AVANCE DEL POSTE)
function mapDatos9M(aoa) {
  const hr = findHeaderRow(aoa, ['NUMERO', 'IZAJE', 'DEMOLICION', 'EXCAVACION'], true);
  if (hr < 0) return null;
  const h = aoa[hr].map((c) => String(c).trim().toUpperCase());
  const pctIdx = h.findIndex((c) => c.includes('% AVANCE'));
  if (pctIdx < 0) return null;
  const acc = { sum: 0, total: 0, completos: 0 };
  for (let i = hr + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || (String(r[0] || '').trim() === '' && cellNum(r[pctIdx]) === null)) continue;
    agregaPct(acc, cellNum(r[pctIdx]));
  }
  if (acc.total === 0) return null;
  const acts = { 'PE-02': { pct: Math.round((100 * acc.sum) / acc.total), cantidad: acc.completos, totalUnidades: acc.total } };
  return { actividades: acts, filas: acc.total, detalle: 'postes 9m' };
}

// Inventario de cámaras instaladas -> PE-07 (izaje de cámaras de videovigilancia)
function mapDatosCamaras(aoa) {
  let hr = -1, camIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 4); i++) {
    const cells = aoa[i].map((c) => String(c).trim().toUpperCase());
    const j = cells.findIndex((c) => c === 'CAMARA');
    if (j >= 0) { hr = i; camIdx = j; break; }
  }
  if (hr < 0 || camIdx < 0) return null;
  let count = 0;
  for (let i = hr + 1; i < aoa.length; i++) {
    const r = aoa[i];
    const v = r && camIdx < r.length ? String(r[camIdx]).trim() : '';
    if (/^CAM\s*\d+/i.test(v)) count++;
  }
  if (count === 0) return null;
  const total = db.prepare('SELECT total_unidades FROM actividades WHERE codigo=?').get('PE-07')?.total_unidades || count;
  return {
    actividades: { 'PE-07': { pct: Math.min(100, Math.round((100 * count) / total)), cantidad: count, totalUnidades: total } },
    filas: count,
    detalle: 'cámaras instaladas',
  };
}

// Libro3: botones de pánico -> PE-05 (botones) y PE-04 (dados/BASE)
function mapDatosBotones(aoa) {
  const hr = findHeaderRow(aoa, ['NUMERO', 'CABLE', 'BASE'], true);
  if (hr < 0) return null;
  const h = aoa[hr].map((c) => String(c).trim().toUpperCase());
  const pctIdx = h.findIndex((c) => c.includes('% AVANCE'));
  const baseIdx = h.findIndex((c) => c === 'BASE');
  if (pctIdx < 0) return null;
  const acc = { sum: 0, total: 0, completos: 0, bases: 0 };
  for (let i = hr + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || (String(r[0] || '').trim() === '' && cellNum(r[pctIdx]) === null)) continue;
    agregaPct(acc, cellNum(r[pctIdx]), { done: baseIdx >= 0 && isDone(r[baseIdx]), key: 'bases' });
  }
  if (acc.total === 0) return null;
  const acts = { 'PE-05': { pct: Math.round((100 * acc.sum) / acc.total), cantidad: acc.completos, totalUnidades: acc.total } };
  if (baseIdx >= 0) acts['PE-04'] = { pct: Math.round((100 * acc.bases) / acc.total), cantidad: acc.bases, totalUnidades: acc.total };
  return { actividades: acts, filas: acc.total, detalle: 'botones de pánico' };
}

function mapDatosArchivo(buf) {
  let wb = null;
  try { wb = XLSX.read(buf, { type: 'buffer', cellDates: true }); } catch { return null; }
  if (!wb || !wb.SheetNames) return null;
  const porHoja = [];
  for (const name of wb.SheetNames) {
    const n = name.toUpperCase();
    let aoa;
    try { aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', cellDates: true }); } catch { continue; }
    let m = null;
    if (n.includes('13M')) m = mapDatos13M(aoa);
    else if (n.includes('9M') && !n.includes('13M')) m = mapDatos9M(aoa);
    else if (n.includes('BOTON')) m = mapDatosBotones(aoa);
    else m = mapDatosCamaras(aoa);
    if (m) porHoja.push({ hoja: name, ...m });
  }
  return porHoja.length ? porHoja : null;
}

// Reemplaza los avances de prueba de Planta Externa por los reales calculados.
function aplicarMapeo(resultados, archivo) {
  const EXT = db.prepare('SELECT id FROM ubicaciones WHERE codigo=?').get('EXT');
  const actMap = db.prepare('SELECT codigo, id FROM actividades WHERE ubicacion_id=?').all(EXT.id)
    .reduce((m, r) => (m.set(r.codigo, r.id), m), new Map());
  const hoy = new Date().toISOString().slice(0, 10);
  const stmt = db.prepare('INSERT INTO avances (actividad_id, sub_actividad_id, fecha, cantidad_realizada, porcentaje_avance, estado, observaciones, causa_retraso_id, usuario_registro) VALUES (?,?,?,?,?,?,?,?,?)');
  let n = 0;
  for (const res of resultados) {
    for (const [codigo, d] of Object.entries(res.actividades)) {
      const actId = actMap.get(codigo);
      if (!actId) continue;
      db.prepare('DELETE FROM avances WHERE actividad_id=?').run(actId);
      const estado = d.pct >= 100 ? 'Completado' : 'En progreso';
      stmt.run(actId, null, hoy, d.cantidad, d.pct, estado, `Importado de ${archivo} (${d.cantidad}/${d.totalUnidades} ${d.totalUnidades > 1 ? 'unidades' : 'unidad'})`, null, 'Carga Excel');
      n++;
    }
  }
  return n;
}

router.post('/datos/preview', (req, res) => {
  const buf = Buffer.isBuffer(req.body) ? req.body : (req.body && req.body.file ? Buffer.from(req.body.file, 'base64') : null);
  if (!buf || buf.length === 0) return res.status(400).json({ error: 'Falta archivo' });
  const r = mapDatosArchivo(buf);
  if (!r) return res.status(400).json({ error: 'No se reconoció un libro DATOS de Planta Externa (esperaba pestañas con 13M, 9M o BOTONES).' });
  res.json({ hojas: r });
});

// Importa todos los libros .xlsx de seguimiento que estén en la carpeta data/
router.post('/datos/import-carpeta', (req, res) => {
  const DATA_DIR = path.join(__dirname, '..', '..', 'data');
  const archivos = fs.readdirSync(DATA_DIR).filter((f) => /\.xlsx$/i.test(f) && !/^~\$/.test(f));
  // el inventario de cámaras se procesa al final para que sea la fuente que define PE-07
  archivos.sort((a, b) => (/(camara|instalad)/i.test(a) ? 1 : 0) - (/(camara|instalad)/i.test(b) ? 1 : 0));
  const reporte = [];
  let totalInserts = 0;
  for (const f of archivos) {
    const buf = fs.readFileSync(path.join(DATA_DIR, f));
    const r = mapDatosArchivo(buf);
    if (!r) { reporte.push({ archivo: f, hojas: [], error: 'no reconocido' }); continue; }
    const n = aplicarMapeo(r, f);
    totalInserts += n;
    reporte.push({ archivo: f, hojas: r.map((h) => ({ hoja: h.hoja, detalle: h.detalle, filas: h.filas, actividades: h.actividades })), insertados: n });
  }
  // eliminar los avances de prueba (demo) para dejar SOLO los datos reales importados
  const purgado = db.prepare('DELETE FROM avances WHERE usuario_registro = ?').run('Supervisor Campo').changes;
  res.json({ procesados: reporte.length, registros_actualizados: totalInserts, demo_eliminados: purgado, reporte });
});

router.post('/preview', (req, res) => {
  let buf;
  if (Buffer.isBuffer(req.body)) {
    buf = req.body;
  } else if (req.body && typeof req.body.file === 'string') {
    buf = Buffer.from(req.body.file, 'base64');
  }
  if (!buf || buf.length === 0) return res.status(400).json({ error: 'Falta archivo' });
  log('PREVIEW bytes=' + buf.length, 'origen=' + (Buffer.isBuffer(req.body) ? 'raw' : 'base64'));
  let parsed;
  try { parsed = parseWorkbook(buf); }
  catch (e) {
    log('PREVIEW ERROR', String(e && e.message || e));
    return res.status(400).json({ error: 'No se pudo leer el archivo: ' + e.message });
  }
  log('PREVIEW detalle=' + parsed.tecnico.detalle, 'filas=' + parsed.filas.length, 'hojas=' + (parsed.tecnico.hojas || []).length);

  const validados = parsed.filas.map((r, i) => validarFila({ ...r, nro: i + 2 }));
  // detectar duplicados dentro del mismo archivo
  const seen = new Set();
  for (const r of validados) {
    const key = `${r.actividad_id ?? ''}|${r.sub_actividad_id ?? 0}|${r.fecha ?? ''}`;
    if (seen.has(key)) r.errors.push('Duplicado dentro del archivo');
    seen.add(key);
  }
  const validas = validados.filter((x) => x.errors.length === 0);

  const hojasAvances = parsed.sheets.filter((s) => s.esAvances);
  let mensaje = null;
  if (parsed.tecnico.detalle === 'no_se_pudo') {
    mensaje = {
      tipo: 'error',
      texto: 'El archivo no se pudo abrir como Excel. Asegúrate de que sea un .xlsx, .xls, .ods o .csv real (no un archivo renombrado) y vuelve a intentar.',
      sheets: parsed.sheets,
    };
  } else if (parsed.filas.length === 0) {
    mensaje = {
      tipo: 'error',
      texto: 'El archivo se abrió pero no se encontraron filas de avance. Revisa que una pestaña tenga columnas como: Fecha, Ubicación/Planta, Actividad/Sistema, % Avance/Avance. Abajo se muestran las pestañas y columnas detectadas.',
      sheets: parsed.sheets,
    };
  } else if (validas.length === 0) {
    mensaje = {
      tipo: 'aviso',
      texto: 'El archivo se leyó pero ninguna fila pasó la validación. Revisa los errores de cada fila.',
      sheets: parsed.sheets,
    };
  }

  res.json({
    filas: validados,
    total: validados.length,
    validas: validas.length,
    errores: validados.length - validas.length,
    sheets: parsed.sheets,
    hojas_avances: hojasAvances.length,
    tecnico: parsed.tecnico,
    mensaje,
  });
});

router.post('/import', (req, res) => {
  const { rows, archivo_nombre } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows requerido' });
  let procesadas = 0, errores = 0;
  const stmt = db.prepare(`INSERT INTO avances (actividad_id, sub_actividad_id, fecha, cantidad_realizada, porcentaje_avance, estado, observaciones, causa_retraso_id, usuario_registro) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const r of rows) {
    if (!r.actividad_id) { errores++; continue; }
    let causa = null;
    if (r.causa) {
      const c = db.prepare('SELECT id FROM causas_retraso WHERE nombre=?').get(String(r.causa).trim());
      if (c) causa = c.id;
    }
    stmt.run(r.actividad_id, r.sub_actividad_id || null, r.fecha, Number(r.cantidad || 0), Number(r.pct || 0), r.estado || 'En progreso', r.observaciones || null, causa, 'Carga Excel');
    procesadas++;
  }
  db.prepare('INSERT INTO cargas_excel (archivo_nombre, filas_procesadas, filas_errores, usuario) VALUES (?,?,?,?)')
    .run(archivo_nombre || 'carga.xlsx', procesadas, errores, 'Sistema');
  res.json({ procesadas, errores });
});

router.get('/historial', (req, res) => {
  const rows = db.prepare('SELECT * FROM cargas_excel ORDER BY fecha_carga DESC LIMIT 50').all();
  res.json({ historial: rows });
});

router.get('/plantilla', (req, res) => {
  const encabezados = ['Fecha', 'Ubicación', 'Actividad', 'Sub-actividad', 'Cantidad', '% Avance', 'Estado', 'Observaciones', 'Causa'];
  const ws = XLSX.utils.aoa_to_sheet([encabezados]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Avances');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_avances.xlsx"');
  res.send(buf);
});

export default router;