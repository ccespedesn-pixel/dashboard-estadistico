import { Router } from 'express';
import { db } from '../lib/db.js';
import { UBICACIONES, CAUSAS } from '../seed.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    ubicaciones: UBICACIONES.map((u) => ({ ...u })),
    causas: CAUSAS,
    estados: ['En progreso', 'Completado', 'Pausado', 'Con retraso'],
  });
});

export default router;