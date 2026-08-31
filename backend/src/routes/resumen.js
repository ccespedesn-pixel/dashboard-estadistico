import { Router } from 'express';
import { db } from '../lib/db.js';
import { actividadesConProgreso, evolucionTemporal, heatmap } from '../lib/progress.js';

const router = Router();

// KPI: avance global ponderado por el total de unidades de cada actividad
function kpiGlobal(data) {
  const totalUnidades = data.reduce((a, d) => a + (d.total_unidades || 0), 0) || 1;
  const ponderado = data.reduce((a, d) => a + (d.pct * (d.total_unidades || 1)), 0);
  return Math.round((ponderado / totalUnidades) * 10) / 10;
}

function tiempoPromedioEjecucion() {
  const rows = db.prepare(`
    SELECT actividad_id, MIN(fecha) AS inicio, MAX(fecha) AS fin,
           COUNT(DISTINCT sub_actividad_id || '') AS nsubs
    FROM avances GROUP BY actividad_id`).all();
  if (rows.length === 0) return 0;
  const dias = rows.map((r) => {
    const ini = new Date(r.inicio);
    const fin = new Date(r.fin);
    return Math.max(1, Math.round((fin - ini) / 86400000));
  });
  return Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);
}

router.get('/', (req, res) => {
  const { ubicacion, estado, q } = req.query;
  const data = actividadesConProgreso({ ubicacion: ubicacion || 'TODAS', estado: estado || 'TODOS', q });

  const estados = { 'Completado': 0, 'En progreso': 0, 'Con retraso': 0, 'Pausado': 0 };
  for (const d of data) estados[d.estado] = (estados[d.estado] || 0) + 1;

  const porUbicacion = ['COSC', 'PAR', 'EXT'].map((u) => {
    const items = data.filter((d) => d.ubicacion === u);
    return {
      ubicacion: u,
      nombre: u === 'COSC' ? 'Planta Interna COSC' : u === 'PAR' ? 'Planta Interna PAR' : 'Planta Externa',
      avance: items.length ? Math.round(items.reduce((a, d) => a + d.pct, 0) / items.length * 10) / 10 : 0,
      completadas: items.filter((i) => i.estado === 'Completado').length,
      total: items.length,
    };
  });

  const evolucion = evolucionTemporal(90);

  const heat = heatmap();
  const heatRows = heat.filter((h) => h.sub_actividad !== null);
  const heatGlobales = heat.filter((h) => h.sub_actividad === null);

  res.json({
    kpi: {
      avance_global: kpiGlobal(data),
      completadas: estados['Completado'],
      en_progreso: estados['En progreso'],
      con_retraso: estados['Con retraso'],
      pausado: estados['Pausado'],
      total: data.length,
      tiempo_promedio_dias: tiempoPromedioEjecucion(),
    },
    distribucion_estados: estados,
    por_ubicacion: porUbicacion,
    por_actividad: data.map((d) => ({
      codigo: d.codigo, nombre: d.nombre, ubicacion: d.ubicacion,
      pct: d.pct, estado: d.estado, causa: d.causa,
      cantidad_realizada: d.cantidad_realizada || 0, total_unidades: d.total_unidades || 0,
      unidad_medida: d.unidad_medida,
    })),
    evolucion,
    heatmap: { sub_actividades: heatRows, globales: heatGlobales },
  });
});

// Sistemas del catálogo que aún NO tienen ningún avance cargado (petición de datos)
router.get('/faltantes', (req, res) => {
  const rows = db.prepare(`
    SELECT a.codigo, a.nombre, a.total_unidades, a.unidad_medida, a.dias_planificados,
           u.codigo AS ubicacion, u.nombre AS ubicacion_nombre,
           (SELECT COUNT(*) FROM avances av WHERE av.actividad_id = a.id) AS n_avances,
           (SELECT GROUP_CONCAT(sa.nombre, ', ') FROM sub_actividades sa WHERE sa.actividad_id = a.id) AS sub_actividades
    FROM actividades a JOIN ubicaciones u ON u.id = a.ubicacion_id
    ORDER BY a.codigo
  `).all();
  const faltantes = rows.filter((r) => r.n_avances === 0);
  const conDatos = rows.filter((r) => r.n_avances > 0);
  res.json({
    faltantes: faltantes.reduce((m, r) => {
      (m[r.ubicacion] ??= []).push(r);
      return m;
    }, {}),
    con_datos: conDatos.reduce((m, r) => {
      (m[r.ubicacion] ??= []).push(r);
      return m;
    }, {}),
    totales: { sistemas: rows.length, con_datos: conDatos.length, faltantes: faltantes.length },
  });
});

export default router;