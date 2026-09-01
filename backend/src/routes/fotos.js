import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'fotos');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  },
});

const router = Router();

router.get('/obra-panel', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM obra_fotos WHERE item_id = o.id AND tipo = 'ejecutada') AS fotos_ejecutadas,
        (SELECT COUNT(*) FROM obra_fotos WHERE item_id = o.id AND tipo = 'pendiente') AS fotos_pendientes
      FROM obra_items o
      ORDER BY o.area, o.grupo, o.codigo
    `).all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:itemId', (req, res) => {
  try {
    const fotos = db.prepare('SELECT * FROM obra_fotos WHERE item_id = ? ORDER BY tipo, fecha DESC').all(req.params.itemId);
    res.json(fotos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('foto'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });
    const { item_id, tipo = 'ejecutada', descripcion = '' } = req.body;
    if (!item_id) return res.status(400).json({ error: 'Falta item_id' });
    const result = db.prepare(
      'INSERT INTO obra_fotos (item_id, tipo, archivo, descripcion) VALUES (?, ?, ?, ?)'
    ).run(Number(item_id), tipo, req.file.filename, descripcion);
    res.json({ id: result.lastInsertRowid, archivo: req.file.filename, tipo, descripcion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const foto = db.prepare('SELECT * FROM obra_fotos WHERE id = ?').get(req.params.id);
    if (!foto) return res.status(404).json({ error: 'Foto no encontrada' });
    const filePath = path.join(UPLOAD_DIR, foto.archivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM obra_fotos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
