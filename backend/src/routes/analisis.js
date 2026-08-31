import { Router } from 'express';
import { db } from '../lib/db.js';
import { actividadesConProgreso } from '../lib/progress.js';

const router = Router();

function tiempos() {
  const rows = db.prepare(`
    SELECT a.id, a.codigo, a.nombre, a.ubicacion_id, a.dias_planificados, u.codigo AS ubicacion,
           MIN(av.fecha) AS fecha_inicio, MAX(av.fecha) AS fecha_fin
    FROM actividades a
    JOIN ubicaciones u ON u.id = a.ubicacion_id
    LEFT JOIN avances av ON av.actividad_id = a.id
    GROUP BY a.id, a.codigo, a.nombre, a.ubicacion_id, a.dias_planificados, u.codigo
  `).all();

  return rows.map((r) => {
    const hoy = new Date();
    const inicio = r.fecha_inicio ? new Date(r.fecha_inicio) : hoy;
    const fin = r.fecha_fin ? new Date(r.fecha_fin) : hoy;
    const diasReales = Math.max(1, Math.round((fin - inicio) / 86400000));
    const plan = r.dias_planificados || 1;
    return {
      codigo: r.codigo,
      nombre: r.nombre,
      ubicacion: r.ubicacion,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      dias_reales: diasReales,
      dias_planificados: plan,
      desviacion: diasReales - plan,
    };
  });
}

router.get('/tiempos', (req, res) => {
  const all = tiempos();
  const ordenados = [...all].sort((a, b) => b.desviacion - a.desviacion);
  const lentas = ordenados.slice(0, 5).filter((t) => t.desviacion > 0);
  const rapidas = [...all].sort((a, b) => a.desviacion - b.desviacion).slice(0, 5).filter((t) => t.desviacion < 0);

  const porTipo = {};
  for (const t of all) {
    const key = t.ubicacion === 'COSC' ? 'Interna COSC' : t.ubicacion === 'PAR' ? 'Interna PAR' : 'Externa';
    (porTipo[key] ??= { count: 0, suma: 0 });
    porTipo[key].count++; porTipo[key].suma += t.dias_reales;
  }
  const porUbicacion = Object.entries(porTipo).map(([tipo, v]) => ({ tipo, promedio: Math.round(v.suma / v.count) }));

  const promGeneral = all.length ? Math.round(all.reduce((a, t) => a + t.dias_reales, 0) / all.length) : 0;

  res.json({ tiempos: all, top_lentas: lentas, top_rapidas: rapidas, promedio_general: promGeneral, promedio_por_ubicacion: porUbicacion });
});

const RECOMENDACIONES = {
  'Falta de materiales': 'Revisar la cadena de suministro y anticipar órdenes de compra.',
  'Problemas climáticos': 'Implementar plan de contingencia y reprogramar frentes de trabajo.',
  'Personal insuficiente': 'Reforzar el equipo de campo para las actividades críticas.',
  'Logística': 'Optimizar rutas y distribución de recursos en el terreno.',
  'Permisos': 'Agilizar la gestión documental con las entidades correspondientes.',
  'Falta de energía': 'Coordinar con el proveedor de energía y prever generadores.',
  'Otros': 'Registrar detalle en observaciones y analizar caso a caso.',
};

router.get('/causas', (req, res) => {
  const { ubicacion, fecha_desde, fecha_hasta, actividad } = req.query;
  const where = [];
  const params = [];
  if (ubicacion && ubicacion !== 'TODAS') { where.push('u.codigo = ?'); params.push(ubicacion); }
  if (fecha_desde) { where.push('av.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { where.push('av.fecha <= ?'); params.push(fecha_hasta); }
  if (actividad) { where.push('a.codigo = ?'); params.push(actividad); }
  if (where.length) where.push('cr.id IS NOT NULL');
  else where.push('cr.id IS NOT NULL');

  const rows = db.prepare(`
    SELECT cr.nombre AS causa, a.codigo, a.nombre AS actividad, av.fecha
    FROM avances av
    JOIN actividades a ON a.id = av.actividad_id
    JOIN ubicaciones u ON u.id = a.ubicacion_id
    JOIN causas_retraso cr ON cr.id = av.causa_retraso_id
    WHERE ${where.join(' AND ')}
  `).all(...params);

  const porCausa = new Map();
  for (const r of rows) {
    if (!porCausa.has(r.causa)) porCausa.set(r.causa, { frecuencia: 0, actividades: new Set(), frentes: new Set() });
    const c = porCausa.get(r.causa);
    c.frecuencia++;
    c.actividades.add(r.codigo);
    c.frentes.add(r.codigo);
  }

  const resultado = [...porCausa.entries()].map(([causa, v]) => ({
    causa,
    frecuencia: v.frecuencia,
    actividades: [...v.actividades],
    impacto: Math.round(v.frecuencia * 1.5),
    recomendacion: RECOMENDACIONES[causa] || 'Analizar detalle en observaciones.',
  })).sort((a, b) => b.frecuencia - a.frecuencia);

  // nube de palabras
  const obs = db.prepare(`
    SELECT observaciones FROM avances WHERE observaciones IS NOT NULL AND observaciones != ''
  `).all().map((r) => r.observaciones).join(' ');

  const tokenCount = {};
  for (const w of obs.toLowerCase().replace(/[^a-z\u00e0-\u00ff ]/g, ' ').split(/\s+/)) {
    if (w.length > 3) tokenCount[w] = (tokenCount[w] || 0) + 1;
  }
  const nube = Object.entries(tokenCount).map(([texto, count]) => ({ texto, count })).sort((a, b) => b.count - a.count).slice(0, 30);

  res.json({ causas: resultado, total_registros: rows.length, recomendaciones: resultado.map((r) => ({ causa: r.causa, recomendacion: r.recomendacion })), observaciones: obs, nube });
});

export default router;