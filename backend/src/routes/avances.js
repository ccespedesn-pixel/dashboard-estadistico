import { Router } from 'express';
import { db } from '../lib/db.js';

const router = Router();

const ESTADOS = ['En progreso', 'Completado', 'Pausado', 'Con retraso'];

router.get('/', (req, res) => {
  const { ubicacion, estado, fecha_desde, fecha_hasta, actividad, causa, q } = req.query;
  const where = [];
  const params = [];

  if (ubicacion && ubicacion !== 'TODAS') {
    where.push('u.codigo = ?'); params.push(ubicacion);
  }
  if (estado && estado !== 'TODOS') {
    where.push('av.estado = ?'); params.push(estado);
  }
  if (fecha_desde) { where.push('av.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { where.push('av.fecha <= ?'); params.push(fecha_hasta); }
  if (causa) { where.push('cr.nombre = ?'); params.push(causa); }
  if (actividad) { where.push('a.codigo = ?'); params.push(actividad); }
  if (q) {
    where.push('(a.codigo LIKE ? OR a.nombre LIKE ? OR sa.nombre LIKE ?)');
    const needle = `%${q}%`;
    params.push(needle, needle, needle);
  }

  const sql = `
    SELECT av.id, av.actividad_id, av.sub_actividad_id, av.fecha, av.cantidad_realizada,
           av.porcentaje_avance AS pct, av.estado, av.observaciones, av.usuario_registro,
           a.codigo AS actividad_codigo, a.nombre AS actividad_nombre, a.unidad_medida,
           u.codigo AS ubicacion,
           sa.nombre AS sub_actividad_nombre,
           cr.nombre AS causa
    FROM avances av
    JOIN actividades a ON a.id = av.actividad_id
    JOIN ubicaciones u ON u.id = a.ubicacion_id
    LEFT JOIN sub_actividades sa ON sa.id = av.sub_actividad_id
    LEFT JOIN causas_retraso cr ON cr.id = av.causa_retraso_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY av.fecha DESC, av.id DESC
    LIMIT 2000`;
  const rows = db.prepare(sql).all(...params);
  res.json({ avances: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { actividad_id, sub_actividad_id, fecha, cantidad_realizada, porcentaje_avance, estado, observaciones, causa, usuario_registro, total_unidades } = req.body;

  if (!actividad_id || !fecha) {
    return res.status(400).json({ error: 'actividad_id y fecha son obligatorios' });
  }
  let pct = Number(String(porcentaje_avance ?? '').trim().replace(/%/g, '').replace(/,/g, '.'));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ error: 'porcentaje_avance debe estar entre 0 y 100' });
  }
  let estadoFinal = estado;
  if (!ESTADOS.includes(estadoFinal)) estadoFinal = 'En progreso';

  let causaId = null;
  if (causa) {
    const c = db.prepare('SELECT id FROM causas_retraso WHERE nombre=?').get(String(causa).trim());
    if (c) causaId = c.id;
  }

  // si el usuario definió el total a ejecutar, se actualiza en la actividad
  const total = Number(String(total_unidades ?? '').trim().replace(/,/g, '.'));
  if (Number.isFinite(total) && total > 0) {
    db.prepare('UPDATE actividades SET total_unidades = ? WHERE id = ?').run(total, actividad_id);
  }

  const stmt = db.prepare(`INSERT INTO avances
    (actividad_id, sub_actividad_id, fecha, cantidad_realizada, porcentaje_avance, estado, observaciones, causa_retraso_id, usuario_registro)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const r = stmt.run(
    actividad_id,
    sub_actividad_id || null,
    fecha,
    Number(cantidad_realizada ?? 0),
    pct,
    estadoFinal,
    observaciones || null,
    causaId,
    usuario_registro || 'Sistema',
  );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const { cantidad_realizada, porcentaje_avance, estado, observaciones, causa } = req.body;
  const exist = db.prepare('SELECT id FROM avances WHERE id=?').get(req.params.id);
  if (!exist) return res.status(404).json({ error: 'No encontrado' });

  let pct = Number(String(porcentaje_avance ?? '').trim().replace(/%/g, '').replace(/,/g, '.'));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ error: 'porcentaje_avance debe estar entre 0 y 100' });
  }
  let estadoFinal = estado;
  if (!ESTADOS.includes(estadoFinal)) estadoFinal = 'En progreso';
  let causaId = null;
  if (causa) {
    const c = db.prepare('SELECT id FROM causas_retraso WHERE nombre=?').get(String(causa).trim());
    if (c) causaId = c.id;
  }

  db.prepare(`UPDATE avances SET
    cantidad_realizada = ?,
    porcentaje_avance = ?,
    estado = ?,
    observaciones = ?,
    causa_retraso_id = ?
    WHERE id = ?`).run(
    Number(cantidad_realizada ?? 0),
    pct,
    estadoFinal,
    observaciones ?? null,
    causaId,
    req.params.id,
  );
  res.json({ ok: true, id: Number(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM avances WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

export default router;