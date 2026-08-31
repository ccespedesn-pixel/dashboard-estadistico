import { db } from './db.js';

// Progreso actual por actividad:
//  - globales: última snapshot sin sub-actividad
//  - externas (con sub-actividades): promedio de la última snapshot de cada sub-actividad
export function currentByActivity() {
  const globales = db.prepare(`
    SELECT actividad_id, porcentaje_avance AS pct, estado, cantidad_realizada AS cantidad,
           (SELECT nombre FROM causas_retraso WHERE id = av.causa_retraso_id) AS causa
    FROM avance_actual av WHERE sub_actividad_id IS NULL
  `).all();
  const subRows = db.prepare(`
    SELECT actividad_id, porcentaje_avance AS pct, estado, cantidad_realizada AS cantidad,
           (SELECT nombre FROM causas_retraso WHERE id = av.causa_retraso_id) AS causa
    FROM avance_actual av WHERE sub_actividad_id IS NOT NULL
  `).all();

  const result = new Map();
  for (const r of globales) result.set(r.actividad_id, { pct: r.pct, estado: r.estado, causa: r.causa, cantidad: r.cantidad });
  const acc = new Map();
  for (const r of subRows) {
    if (!acc.has(r.actividad_id)) acc.set(r.actividad_id, []);
    acc.get(r.actividad_id).push({ pct: r.pct, cantidad: r.cantidad });
  }
  for (const [actId, items] of acc) {
    const avg = items.reduce((a, b) => a + b.pct, 0) / items.length;
    const cantidad = items.reduce((a, b) => a + (b.cantidad || 0), 0);
    const estado = avg >= 99 ? 'Completado' : 'En progreso';
    result.set(actId, { pct: Math.round(avg * 10) / 10, estado, causa: result.get(actId)?.causa || null, cantidad });
  }
  return result;
}

// listado de actividades con su progreso actual
export function actividadesConProgreso(filtros = {}) {
  const prog = currentByActivity();
  const rows = db.prepare(`
    SELECT a.id, a.codigo, a.nombre, a.total_unidades, a.unidad_medida, a.dias_planificados,
           u.codigo AS ubicacion, u.nombre AS ubicacion_nombre
    FROM actividades a JOIN ubicaciones u ON u.id = a.ubicacion_id
  `).all();

  let data = rows.map((r) => {
    const p = prog.get(r.id) || { pct: 0, estado: 'En progreso', causa: null, cantidad: 0 };
    return { ...r, pct: p.pct, estado: p.estado, causa: p.causa, cantidad_realizada: p.cantidad || 0 };
  });

  if (filtros.ubicacion && filtros.ubicacion !== 'TODAS') data = data.filter((d) => d.ubicacion === filtros.ubicacion);
  if (filtros.estado && filtros.estado !== 'TODOS') data = data.filter((d) => d.estado === filtros.estado);
  data.sort((a, b) => a.codigo.localeCompare(b.codigo));
  return data;
}

// evolución temporal: progreso global acumulado en cada fecha donde existan registros
export function evolucionTemporal(limiteDias = 90) {
  const rows = db.prepare(`
    SELECT fecha, porcentaje_avance AS pct
    FROM avances
    WHERE fecha >= date('now', ?)
    ORDER BY fecha`).all(`-${limiteDias} days`);
  const porFecha = new Map();
  for (const r of rows) {
    if (!porFecha.has(r.fecha)) porFecha.set(r.fecha, []);
    porFecha.get(r.fecha).push(r.pct);
  }
  return [...porFecha.entries()]
    .map(([fecha, pcts]) => ({ fecha, pct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 10) / 10 }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// heatmap: pct por (actividad, sub-actividad)
export function heatmap() {
  const rows = db.prepare(`
    SELECT a.codigo, a.nombre AS actividad, u.codigo AS ubicacion,
           sa.nombre AS sub_actividad, aa.porcentaje_avance AS pct
    FROM avance_actual aa
    JOIN actividades a ON a.id = aa.actividad_id
    JOIN ubicaciones u ON u.id = a.ubicacion_id
    LEFT JOIN sub_actividades sa ON sa.id = aa.sub_actividad_id
  `).all();
  return rows;
}
