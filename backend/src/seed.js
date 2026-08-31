import { db } from './lib/db.js';

export const UBICACIONES = [
  { codigo: 'COSC', nombre: 'Planta Interna COSC' },
  { codigo: 'PAR', nombre: 'Planta Interna PAR' },
  { codigo: 'EXT', nombre: 'Planta Externa' },
];

export const CAUSAS = [
  'Falta de materiales',
  'Problemas climáticos',
  'Personal insuficiente',
  'Logística',
  'Permisos',
  'Falta de energía',
  'Otros',
];

// [codigo, nombre, ubicacion, total, unidad, dias_planificados]
const ACTIVIDADES = [
  ['COSC-01', 'Sistema de cableado estructurado', 'COSC', 1, 'Global', 20],
  ['COSC-02', 'Certificado de cableado estructurado', 'COSC', 1, 'Global', 10],
  ['COSC-03', 'Sistema de detección de incendios', 'COSC', 1, 'Global', 25],
  ['COSC-04', 'Sistema de audio y proyección', 'COSC', 1, 'Global', 15],
  ['COSC-05', 'Sistema videowall', 'COSC', 1, 'Global', 20],
  ['COSC-06', 'Sistema de energía estabilizada UPS', 'COSC', 1, 'Global', 12],
  ['COSC-07', 'Sistema de estaciones de trabajo', 'COSC', 1, 'Global', 18],
  ['COSC-08', 'Sistema de control de acceso', 'COSC', 1, 'Global', 15],
  ['COSC-09', 'Sistema de fibra óptica interna', 'COSC', 1, 'Global', 14],
  ['COSC-10', 'Gabinete de comunicaciones en cuartos', 'COSC', 1, 'Global', 8],
  ['COSC-11', 'Gabinete de autocontenido', 'COSC', 1, 'Global', 8],
  ['COSC-12', 'Sistema de aire de precisión', 'COSC', 1, 'Global', 22],
  ['COSC-13', 'Control y detección de incendio (agentes limpios)', 'COSC', 1, 'Global', 16],
  ['COSC-14', 'Sistema de telefonía IP', 'COSC', 1, 'Global', 12],
  ['COSC-15', 'Conectividad Access Point', 'COSC', 1, 'Global', 10],
  ['PAR-01', 'Sistema de cableado estructurado', 'PAR', 1, 'Global', 20],
  ['PAR-02', 'Certificado de cableado estructurado', 'PAR', 1, 'Global', 9],
  ['PAR-03', 'Sistema de detección de incendios', 'PAR', 1, 'Global', 20],
  ['PAR-04', 'Sistema de control de acceso', 'PAR', 1, 'Global', 14],
  ['PAR-05', 'Sistema de fibra óptica interna', 'PAR', 1, 'Global', 12],
  ['PAR-06', 'Gabinete de comunicaciones en cuartos', 'PAR', 1, 'Global', 8],
  ['PAR-07', 'Sistema de telefonía IP', 'PAR', 1, 'Global', 10],
  ['PAR-08', 'Conectividad Access Point', 'PAR', 1, 'Global', 9],
  ['PAR-09', 'Sistema videowall', 'PAR', 1, 'Global', 18],
  ['PAR-10', 'Sistema de estaciones de trabajo', 'PAR', 1, 'Global', 15],
  ['PE-01', 'Postes de 13 metros', 'EXT', 261, 'Postes', 90],
  ['PE-02', 'Postes de 9 metros', 'EXT', 150, 'Postes', 60],
  ['PE-03', 'Pozos a tierra (Cámaras)', 'EXT', 261, 'Pozos', 90],
  ['PE-04', 'Dados para botón de pánico', 'EXT', 20, 'Dados', 20],
  ['PE-05', 'Botones de pánico', 'EXT', 20, 'Botones', 25],
  ['PE-06', 'Pozos a tierra (Botones)', 'EXT', 20, 'Pozos', 25],
  ['PE-07', 'Izaje de cámaras de videovigilancia', 'EXT', 261, 'Cámaras', 80],
];

const SUB_ACTIVIDADES = {
  'PE-01': ['Excavación', 'Izaje', 'Resanado', 'Eliminación excedentes'],
  'PE-02': ['Excavación', 'Izaje', 'Resanado', 'Eliminación excedentes'],
  'PE-03': ['Excavación', 'Llenado', 'Resanado', 'Eliminación', 'Medición'],
  'PE-04': ['Instalación de dados'],
  'PE-05': ['Instalación completa'],
  'PE-06': ['Excavación', 'Llenado', 'Resanado', 'Eliminación', 'Medición'],
  'PE-07': ['Instalación y montaje'],
};

// comparación de sistemas equivalentes COSC vs PAR
export const SISTEMAS_COMPARABLES = [
  { sistema: 'Cableado estructurado', cosc: 'COSC-01', par: 'PAR-01' },
  { sistema: 'Certificado de cableado', cosc: 'COSC-02', par: 'PAR-02' },
  { sistema: 'Detección de incendios', cosc: 'COSC-03', par: 'PAR-03' },
  { sistema: 'Control de acceso', cosc: 'COSC-08', par: 'PAR-04' },
  { sistema: 'Fibra óptica interna', cosc: 'COSC-09', par: 'PAR-05' },
  { sistema: 'Gabinete comunicaciones', cosc: 'COSC-10', par: 'PAR-06' },
  { sistema: 'Telefonía IP', cosc: 'COSC-14', par: 'PAR-07' },
  { sistema: 'Access Point', cosc: 'COSC-15', par: 'PAR-08' },
  { sistema: 'DICEWALL', cosc: 'COSC-05', par: 'PAR-09' },
  { sistema: 'Estaciones de trabajo', cosc: 'COSC-07', par: 'PAR-10' },
];

function seededRandom(seed) {
  const x = Math.sin(seed * 999 + 12345) * 10000;
  return x - Math.floor(x);
}
function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function reset() {
  db.exec('DELETE FROM avances; DELETE FROM cargas_excel; DELETE FROM sub_actividades; DELETE FROM actividades; DELETE FROM causas_retraso; DELETE FROM ubicaciones; DELETE FROM sqlite_sequence;');
}

export function seedCatalogo() {
  reset();
  const ubiId = { COSC: 1, PAR: 2, EXT: 3 };
  for (const [i, u] of UBICACIONES.entries()) {
    db.prepare('INSERT INTO ubicaciones (codigo, nombre) VALUES (?,?)').run(u.codigo, u.nombre);
    ubiId[u.codigo] = i + 1;
  }
  const actIds = new Map();
  const insAct = db.prepare('INSERT INTO actividades (codigo, nombre, ubicacion_id, total_unidades, unidad_medida, dias_planificados, tipo) VALUES (?,?,?,?,?,?,?)');
  for (const [codigo, nombre, ub, total, unidad, dias] of ACTIVIDADES) {
    const r = insAct.run(codigo, nombre, ubiId[ub], total, unidad, dias, 'Global');
    actIds.set(codigo, Number(r.lastInsertRowid));
  }
  const insSub = db.prepare('INSERT INTO sub_actividades (actividad_id, nombre, orden) VALUES (?,?,?)');
  for (const [act, subs] of Object.entries(SUB_ACTIVIDADES)) {
    subs.forEach((s, i) => insSub.run(actIds.get(act), s, i));
  }
  const insCausa = db.prepare('INSERT INTO causas_retraso (nombre, descripcion) VALUES (?,?)');
  for (const c of CAUSAS) insCausa.run(c, `Causa de retraso: ${c}`);
  return { actIds };
}

function insAvance(actividad_id, sub_actividad_id, fecha, cantidad, pct, estado, obs, causa, usuario = 'Supervisor Campo') {
  db.prepare('INSERT INTO avances (actividad_id, sub_actividad_id, fecha, cantidad_realizada, porcentaje_avance, estado, observaciones, causa_retraso_id, usuario_registro) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(actividad_id, sub_actividad_id, fecha, cantidad, pct, estado, obs, causa, usuario);
}

export function seedAvances({ actIds } = {}) {
  const ids = actIds ?? db.prepare('SELECT codigo, id FROM actividades').all().reduce((m, r) => (m.set(r.codigo, r.id), m), new Map());
  const causaIds = db.prepare('SELECT id FROM causas_retraso').all();
  const subMap = db.prepare('SELECT actividad_id, id, nombre, orden FROM sub_actividades').all()
    .reduce((m, r) => { (m[r.actividad_id] ??= []).push(r); return m; }, {});

  const TODAY = new Date('2026-08-05');
  const obsPool = [
    'Avance parcial registrado en campo',
    'Pendiente inspección final',
    'Requiere equipos adicionales',
    'En espera de confirmación técnica',
    'Se completó la etapa sin observaciones',
    'Equipo movilizado a siguiente frente',
    '',
  ];

  const estadoFor = (pct, seed) => {
    if (pct >= 99) return 'Completado';
    if (seededRandom(seed) < 0.30) return 'Con retraso';
    if (seededRandom(seed + 7) < 0.12) return 'Pausado';
    return 'En progreso';
  };

  for (const [codigo, , ub, total] of ACTIVIDADES) {
    const actId = ids.get(codigo);
    if (!actId) continue;
    const seedBase = actId * 31;
    let finalPct = 25 + seededRandom(seedBase) * 65; // 25%..90%
    if (actId % 5 === 0) finalPct = 100; // algunos completados
    if (actId % 11 === 0) finalPct = 40; // algunos muy atrasados
    finalPct = round(finalPct, 0);
    const subs = subMap[actId] ?? [];

    if (subs.length === 0) {
      // actividad Global: snapshots de evolución en el tiempo
      const n = 6;
      for (let k = 0; k < n; k++) {
        const pct = round(finalPct * ((k + 1) / n), 0);
        const fecha = new Date(TODAY);
        fecha.setDate(fecha.getDate() - (n - k) * 9 - Math.floor(seededRandom(seedBase + k) * 3));
        const estado = k === n - 1 ? estadoFor(finalPct, seedBase) : 'En progreso';
        const causa = estado === 'Con retraso' ? causaIds[Math.floor(seededRandom(seedBase + k) * causaIds.length)].id : null;
        insAvance(actId, null, fecha.toISOString().slice(0, 10), round((pct / 100) * total, 2), pct, estado, obsPool[(seedBase + k) % obsPool.length], causa);
      }
    } else {
      // externa: snapshot por sub-actividad con cantidades
      const n = 5;
      for (let k = 0; k < n; k++) {
        for (const [si, sub] of subs.entries()) {
          const subProg = seededRandom(seedBase + si * 5 + k) * finalPct;
          const pct = round(subProg, 0);
          const cant = round((pct / 100) * total, 1);
          const fecha = new Date(TODAY);
          fecha.setDate(fecha.getDate() - (n - k) * 9 - Math.floor(seededRandom(seedBase + si + k) * 3));
          const estado = k === n - 1 ? estadoFor(pct, seedBase + si) : 'En progreso';
          const causa = estado === 'Con retraso' ? causaIds[Math.floor(seededRandom(seedBase + si + k) * causaIds.length)].id : null;
          insAvance(actId, sub.id, fecha.toISOString().slice(0, 10), cant, pct, estado, obsPool[(seedBase + si + k) % obsPool.length], causa);
        }
      }
    }
  }
}

export function seedAll() {
  const ids = seedCatalogo();
  seedAvances({ actIds: ids.actIds });
  console.log('Base de datos inicializada con catálogo y datos de prueba.');
}

// ejecutar directamente: node src/seed.js
import { fileURLToPath } from 'node:url';
import path from 'node:path';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedAll();
}
