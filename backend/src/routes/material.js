import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { db } from '../lib/db.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const limpiar = (v) => String(v ?? '').trim();
const num = (v) => {
  const s = limpiar(v);
  if (s === '') return null;
  const n = Number(s.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
};

function areaDeC(cat) {
  if (/data\s*center/i.test(cat)) return 'DATA CENTER';
  if (/planta\s*interna/i.test(cat)) return 'PLANTA INTERNA';
  return 'PLANTA EXTERNA';
}

function importar() {
  const archivos = fs.readdirSync(DATA_DIR).filter((f) => /material/i.test(f) && /\.xlsx?$/i.test(f));
  const upsert = db.prepare(`INSERT INTO material (area, categoria, material, modelo, cantidad, unidad)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(area, categoria, material, modelo) DO UPDATE SET cantidad=excluded.cantidad, unidad=excluded.unidad`);
  const porArchivos = [];
  const llaves = new Set();
  let total = 0;

  for (const f of archivos) {
    let wb;
    try { wb = XLSX.read(fs.readFileSync(path.join(DATA_DIR, f)), { type: 'buffer' }); } catch { continue; }
    let cuenta = 0;
    for (const sn of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      let cat = 'GENERAL';
      for (const r of aoa) {
        if (!r) continue;
        const material = limpiar(r[0]);
        const modelo = limpiar(r[1]);
        const cant = num(r[2]);
        if (!material) continue;
        if (cant === null) { cat = material; continue; }
        const unidad = limpiar(r[3]);
        const area = areaDeC(cat);
        upsert.run(area, cat, material, modelo, cant, unidad);
        llaves.add(`${area}|${cat}|${material}|${modelo}`);
        total++;
        cuenta++;
      }
    }
    porArchivos.push({ archivo: f, items: cuenta });
  }

  if (llaves.size) {
    const arr = [...llaves];
    const ph = arr.map(() => '?').join(',');
    db.prepare(`DELETE FROM material WHERE (area || '|' || categoria || '|' || material || '|' || modelo) NOT IN (${ph})`).run(...arr);
  }
  return { archivos: porArchivos, items: total };
}

// vista agrupada por área (los desactivados se listan pero NO suman en los importes)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM material ORDER BY area, categoria, id').all();
  const porArea = {};
  let gItems = 0, gCant = 0, gImporte = 0, gInactivos = 0;
  for (const r of rows) {
    if (!porArea[r.area]) porArea[r.area] = { items: 0, cantidad: 0, importe: 0, inactivos: 0, categorias: {} };
    const A = porArea[r.area];
    const activo = r.activo !== 0;
    if (!activo) { A.inactivos++; gInactivos++; }
    if (!A.categorias[r.categoria]) A.categorias[r.categoria] = { items: [], importe: 0, inactivos: 0 };
    const C = A.categorias[r.categoria];
    C.items.push(r);
    if (activo) {
      A.items++;
      A.cantidad = Math.round((A.cantidad + (r.cantidad || 0)) * 10) / 10;
      const importe = (r.cantidad || 0) * (r.precio_unit || 0);
      A.importe = Math.round((A.importe + importe) * 100) / 100;
      C.importe = Math.round((C.importe + importe) * 100) / 100;
      gItems++;
      gCant += r.cantidad || 0;
      gImporte += importe;
    } else {
      C.inactivos++;
    }
  }
  res.json({
    areas: Object.entries(porArea).map(([nombre, a]) => ({
      area: nombre,
      items: a.items,
      cantidad: Math.round(a.cantidad * 10) / 10,
      importe: a.importe,
      inactivos: a.inactivos,
      categorias: Object.entries(a.categorias).map(([c, v]) => ({ categoria: c, importe: v.importe, items: v.items, inactivos: v.inactivos })),
    })),
    total: { items: gItems, cantidad: Math.round(gCant * 10) / 10, importe: Math.round(gImporte * 100) / 100, inactivos: gInactivos },
  });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const area = String(b.area ?? '').trim().toUpperCase();
  const material = String(b.material ?? '').trim();
  const categoria = String(b.categoria ?? 'GENERAL').trim() || 'GENERAL';
  if (!area) return res.status(400).json({ error: 'area es obligatorio' });
  if (!material) return res.status(400).json({ error: 'material es obligatorio' });
  const modelo = String(b.modelo ?? '').trim();
  const cantidad = Number(b.cantidad ?? 0);
  const precio_unit = Number(b.precio_unit ?? 0);
  if (!Number.isFinite(cantidad) || cantidad < 0) return res.status(400).json({ error: 'cantidad debe ser un número >= 0' });
  if (!Number.isFinite(precio_unit) || precio_unit < 0) return res.status(400).json({ error: 'precio_unit debe ser un número >= 0' });
  const unidad = String(b.unidad ?? '').trim();
  try {
    const r = db.prepare('INSERT INTO material (area, categoria, material, modelo, cantidad, unidad, precio_unit, activo) VALUES (?,?,?,?,?,?,?,1)')
      .run(area, categoria, material, modelo, cantidad, unidad, precio_unit);
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch (e) {
    if (/UNIQUE constraint/i.test(e.message)) {
      return res.status(400).json({ error: 'Ya existe otro ítem con el mismo material y modelo en esta categoría' });
    }
    return res.status(500).json({ error: 'Error al crear: ' + e.message });
  }
});

router.put('/:id', (req, res) => {
  const b = req.body || {};
  const id = Number(req.params.id);
  const numericos = { cantidad: 'cantidad', precio_unit: 'precio_unit' };
  const texto = { unidad: 'unidad', modelo: 'modelo' };
  const sets = [];
  const params = [];
  for (const [k, col] of Object.entries(numericos)) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: `${k} debe ser un número >= 0` });
    sets.push(`${col} = ?`);
    params.push(n);
  }
  for (const [k, col] of Object.entries(texto)) {
    if (b[k] === undefined) continue;
    sets.push(`${col} = ?`);
    params.push(String(b[k] ?? '').trim());
  }
  if (b.activo !== undefined) {
    sets.push('activo = ?');
    params.push(b.activo ? 1 : 0);
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos a actualizar' });
  params.push(id);
  try {
    const r = db.prepare(`UPDATE material SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    if (!r.changes) return res.status(404).json({ error: 'Ítem no encontrado' });
  } catch (e) {
    if (/UNIQUE constraint/i.test(e.message)) {
      return res.status(400).json({ error: 'Ya existe otro ítem con el mismo material y modelo' });
    }
    return res.status(500).json({ error: 'Error al actualizar: ' + e.message });
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM material WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) return res.status(404).json({ error: 'Ítem no encontrado' });
  res.json({ ok: true });
});

router.post('/importar', (req, res) => {
  try {
    const r = importar();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'Error al importar: ' + e.message });
  }
});

export default router;