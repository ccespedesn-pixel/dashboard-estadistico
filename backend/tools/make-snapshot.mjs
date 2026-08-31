import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.API_URL || 'http://localhost:4000';
const OUT = path.join(__dirname, '..', '..', 'frontend', 'public', 'static', 'snapshot.json');

const endPoints = [
  ['/api/meta', 'meta'],
  ['/api/resumen?ubicacion=TODAS&estado=TODOS', 'resumen'],
  ['/api/actividades?ubicacion=TODAS&estado=TODOS', 'actividades'],
  ['/api/avances?ubicacion=TODAS&estado=TODOS', 'avances'],
  ['/api/resumen/faltantes', 'faltantes'],
  ['/api/analisis/tiempos', 'tiempos'],
  ['/api/analisis/causas?ubicacion=TODAS', 'causas'],
  ['/api/comparativo', 'comparativo'],
  ['/api/excel/historial', 'historial'],
  ['/api/obra/detalle?area=TODAS', 'obra'],
  ['/api/obra/tiempos', 'obraTiempos'],
  ['/api/material', 'material'],
];

const snapshot = { fecha: new Date().toLocaleString('es-PE') };
for (const [url, key] of endPoints) {
  try {
    const r = await fetch(BASE + url);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    snapshot[key] = await r.json();
    console.log(`OK  ${url}`);
  } catch (e) {
    snapshot[key] = null;
    console.log(`ERR ${url} -> ${e.message.slice(0, 80)}`);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(snapshot));
console.log('snapshot guardado:', OUT, `(${Math.round(fs.statSync(OUT).size / 1024)} KB)`);