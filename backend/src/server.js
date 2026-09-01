import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { db, DB_PATH } from './lib/db.js';
import * as auth from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

global.uploadDir = os.tmpdir();

// seed si está vacío
const count = db.prepare('SELECT COUNT(*) c FROM actividades').get().c;
if (count === 0) {
  const { seedAll } = await import('./seed.js');
  seedAll();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));
// subida binaria cruda del Excel (sin base64): más rápida y admite archivos grandes
app.use('/api/excel/preview', express.raw({ type: () => true, limit: '200mb' }));
app.use('/api/excel/import', express.raw({ type: () => true, limit: '200mb' }));

// registrar errores de tamaño/parsing de body para diagnóstico
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.type === 'entity.parse.failed')) {
    try {
      fs.appendFileSync(path.join(__dirname, '..', 'data', 'uploads.log'), `[${new Date().toISOString()}] BODY_ERROR ${err.type} ruta=${req.originalUrl}\n`);
    } catch { /* noop */ }
    return res.status(413).json({ error: 'El archivo supera el tamaño permitido (200MB).' });
  }
  next(err);
});

// evitar caché en las respuestas de la API (el dashboard se actualiza en tiempo real)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: DB_PATH }));

// ---------- AUTENTICACIÓN ----------
auth.inicializarUsuarios();

// deja el usuario (si existe token válido) disponible en req.user
app.use('/api', (req, res, next) => {
  req.user = auth.usuarioDeToken(auth.tokenDeReq(req));
  next();
});

app.post('/api/auth/login', (req, res) => {
  const { usuario, password } = req.body || {};
  const token = auth.login(usuario, password);
  if (!token) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  res.json({ token, user: auth.usuarioDeToken(token) });
});

app.post('/api/auth/logout', (req, res) => {
  auth.logout(auth.tokenDeReq(req));
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null });
});

// Modo edición: editable si (a) petición local (sin cf-ray) o (b) hay sesión válida.
// El acceso público anónimo sigue siendo de solo lectura.
const esTunel = (req) => Boolean(req.headers['cf-ray']);
const editable = (req) => !esTunel(req) || Boolean(req.user);
app.use('/api', (req, res, next) => {
  if (!editable(req)) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({
        error: 'Modo solo lectura',
        message: 'Inicia sesión para editar desde el acceso externo.'
      });
    }
    req.readonly = true;
  }
  next();
});

// el frontend consulta el modo (editable + usuario) para mostrar/ocultar controles
app.get('/api/mode', (req, res) => res.json({ readonly: !editable(req), user: req.user || null }));

// rutas
const meta = await import('./routes/meta.js');
const actividades = await import('./routes/actividades.js');
const avances = await import('./routes/avances.js');
const resumen = await import('./routes/resumen.js');
const analisis = await import('./routes/analisis.js');
const comparativo = await import('./routes/comparativo.js');
const excel = await import('./routes/excel.js');
const obra = await import('./routes/obra.js');
const material = await import('./routes/material.js');
const reportes = await import('./routes/reportes.js');
const fotos = await import('./routes/fotos.js');
const dossier = await import('./routes/dossier.js');

app.use('/api/meta', meta.default);
app.use('/api/actividades', actividades.default);
app.use('/api/avances', avances.default);
app.use('/api/resumen', resumen.default);
app.use('/api/analisis', analisis.default);
app.use('/api/comparativo', comparativo.default);
app.use('/api/excel', excel.default);
app.use('/api/obra', obra.default);
app.use('/api/material', material.default);
app.use('/api/reportes', reportes.default);
app.use('/api/fotos', fotos.default);
app.use('/api/dossier', dossier.default);

// servir fotos subidas
const uploadsDir = path.join(__dirname, '..', 'uploads', 'fotos');
app.use('/uploads/fotos', express.static(uploadsDir));

// servir build frontend si existe
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// logo servido desde la carpeta data (LOGO.png) para que se actualice al reemplazarlo
const logoPath = path.join(__dirname, '..', 'data', 'LOGO.png');
app.get('/logo.png', (req, res) => {
  if (fs.existsSync(logoPath)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(logoPath);
  } else {
    res.status(404).end();
  }
});
app.get(/^\/(?!api).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend no compilado. Ejecuta el build o usa el dev server.');
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Seguridad Ciudadana corriendo en http://localhost:${PORT}`);
});