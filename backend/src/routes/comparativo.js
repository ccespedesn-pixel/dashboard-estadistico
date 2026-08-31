import { Router } from 'express';
import { db } from '../lib/db.js';
import { currentByActivity } from '../lib/progress.js';
import { SISTEMAS_COMPARABLES } from '../seed.js';

const router = Router();

const nombreActividad = (codigo) => {
  const r = db.prepare('SELECT id FROM actividades WHERE codigo=?').get(codigo);
  return r ? r.id : null;
};

router.get('/', (req, res) => {
  const prog = currentByActivity();
  const sistemas = SISTEMAS_COMPARABLES.map((s) => {
    const idC = nombreActividad(s.cosc);
    const idP = nombreActividad(s.par);
    const pctC = idC ? Math.round((prog.get(idC)?.pct || 0) * 10) / 10 : 0;
    const pctP = idP ? Math.round((prog.get(idP)?.pct || 0) * 10) / 10 : 0;
    return { sistema: s.sistema, cosc: pctC, par: pctP, cosc_codigo: s.cosc, par_codigo: s.par };
  });

  // resumen global COSC vs PAR
  const defensa = (ub) => {
    const rows = db.prepare('SELECT a.id FROM actividades a JOIN ubicaciones u ON u.id=a.ubicacion_id WHERE u.codigo=?').all(ub);
    if (!rows.length) return 0;
    const pcts = rows.map((r) => prog.get(r.id)?.pct || 0);
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 10) / 10;
  };

  res.json({ sistemas, resumen: { cosc: defensa('COSC'), par: defensa('PAR') } });
});

export default router;