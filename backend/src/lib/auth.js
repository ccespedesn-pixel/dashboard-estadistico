import crypto from 'node:crypto';
import { db } from './db.js';

// tabla de usuarios + credenciales iniciales
export function inicializarUsuarios() {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT DEFAULT '',
    rol TEXT DEFAULT 'editor',
    activo INTEGER DEFAULT 1
  )`);
  const seed = [
    { usuario: 'claudio', password: 'Claudio2026!', nombre: 'Claudio', rol: 'admin' },
    { usuario: 'colaborador', password: 'Colab2026!', nombre: 'Colaborador', rol: 'editor' },
    { usuario: 'Maissa', password: 'ConsorcioTQMC', nombre: 'Maissa', rol: 'editor' },
  ];
  const existe = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (existe === 0) {
    const ins = db.prepare('INSERT INTO users (usuario, password_hash, nombre, rol) VALUES (?,?,?,?)');
    for (const u of seed) ins.run(u.usuario, hashPw(u.password), u.nombre, u.rol);
  } else {
    // agrega usuarios faltantes sin duplicar (permite añadir nuevos en un sistema ya sembrado)
    const ins = db.prepare('INSERT OR IGNORE INTO users (usuario, password_hash, nombre, rol) VALUES (?,?,?,?)');
    for (const u of seed) ins.run(u.usuario, hashPw(u.password), u.nombre, u.rol);
  }
}

export function hashPw(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPw(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  const calc = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'));
}

// sesiones en memoria (token -> usuario). Se pierden al reiniciar (hay que volver a entrar).
const sesiones = new Map();

export function login(usuario, password) {
  const u = db.prepare('SELECT * FROM users WHERE usuario = ? AND activo = 1').get(String(usuario));
  if (!u) return null;
  if (!verifyPw(password, u.password_hash)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  sesiones.set(token, { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol });
  return token;
}

export function logout(token) {
  if (token) sesiones.delete(token);
}

export function usuarioDeToken(token) {
  if (!token) return null;
  return sesiones.get(token) || null;
}

// token desde el header Authorization: Bearer xxx
export function tokenDeReq(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

export function obtenerUsuarios() {
  return db.prepare('SELECT id, usuario, nombre, rol FROM users ORDER BY id').all();
}