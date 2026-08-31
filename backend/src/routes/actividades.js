import { Router } from 'express';
import { db } from '../lib/db.js';

const router = Router();

// Progreso actual de cada actividad:
//  - actividades globales: última snapshot sin sub-actividad
//  - actividades externas (con sub-actividades): promedio de la última snapshot de cada sub-actividad
function currentByActivity() {
  const globales = db.prepare(`
    SELECT actividad_id, porcentaje_avance AS pct, estado,
           (SELECT nombre FROM causas_retraso WHERE id = av.causa_retraso_id) AS causa
    FROM avance_actual av WHERE sub_actividad_id IS NULL
  `).all();
  const subRows = db.prepare(`
    SELECT actividad_id, porcentaje_avance AS pct, estado,
           (SELECT nombre FROM causas_retraso WHERE id = av.causa_retraso_id) AS causa
    FROM avance_actual av WHERE sub_actividad_id IS NOT NULL
  `).all();

  const result = new Map();
  for (const r of globales) {
    result.set(r.actividad_id, { pct: r.pct, estado: r.estado, causa: r.causa });
  }
  const acc = new Map();
  for (const r of subRows) {
    if (!acc.has(r.actividad_id)) acc.set(r.actividad_id, []);
    acc.get(r.actividad_id).push(r.pct);
  }
  for (const [actId, pcts] of acc) {
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const estado = avg >= 99 ? 'Completado' : 'En progreso';
    result.set(actId, { pct: Math.round(avg * 10) / 10, estado, causa: result.get(actId)?.causa || null });
  }
  return result;
}

router.get('/', (req, res) => {
  const { ubicacion, estado, q } = req.query;
  const prog = currentByActivity();
  const rows = db.prepare(`
    SELECT a.id, a.codigo, a.nombre, a.total_unidades, a.unidad_medida, a.dias_planificados,
           u.codigo AS ubicacion, u.nombre AS ubicacion_nombre
    FROM actividades a JOIN ubicaciones u ON u.id = a.ubicacion_id
  `).all();

  let data = rows.map((r) => {
    const p = prog.get(r.id) || { pct: 0, estado: 'En progreso', causa: null };
    const subs = db.prepare('SELECT id, nombre, orden FROM sub_actividades WHERE actividad_id=? ORDER BY orden').all(r.id);
    return { ...r, pct: p.pct, estado: p.estado, causa: p.causa, sub_actividades: subs };
  });

  if (ubicacion && ubicacion !== 'TODAS') data = data.filter((d) => d.ubicacion === ubicacion);
  if (estado && estado !== 'TODOS') data = data.filter((d) => d.estado === estado);
  if (q) {
    const needle = q.toLowerCase();
    data = data.filter((d) => d.codigo.toLowerCase().includes(needle) || d.nombre.toLowerCase().includes(needle));
  }
  data.sort((a, b) => a.codigo.localeCompare(b.codigo));
  res.json({ actividades: data, total: data.length });
});

export default router;