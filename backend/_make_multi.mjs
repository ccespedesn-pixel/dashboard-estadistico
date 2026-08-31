import XLSX from 'xlsx';

const headers = ['Fecha', 'Ubicación', 'Actividad', 'Sub-actividad', 'Cantidad', '% Avance', 'Estado', 'Observaciones', 'Causa'];

const wb = XLSX.utils.book_new();

// pestaña 1: portada sin encabezados
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['REGISTRO DE AVANCES SEGURIDAD CIUDADANA'],
  [''],
  ['Este archivo contiene los avances por pestaña'],
]), 'Portada');

// pestaña 2: título en fila 1, encabezados en fila 2
const wsCosC = XLSX.utils.aoa_to_sheet([
  ['AVANCES PLANTA COSC'],
  headers,
  ['2026-07-15', 'COSC', 'COSC-01', '', 1, 55, 'En progreso', 'avance parcial', ''],
  ['2026-07-20', 'COSC', 'COSC-03', '', 1, 40, 'Con retraso', '', 'Falta de materiales'],
  ['2026-07-22', 'COSC', 'COSC-09', '', 1, 70, 'En progreso', '', ''],
]);
XLSX.utils.book_append_sheet(wb, wsCosC, 'COSC');

// pestaña 3: encabezados en fila 1
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  headers,
  ['2026-07-15', 'PAR', 'PAR-01', '', 1, 60, 'En progreso', '', ''],
  ['2026-07-21', 'PAR', 'PAR-05', '', 1, 35, 'Con retraso', '', 'Permisos'],
]), 'PAR');

// pestaña 4: varias filas de título/notas antes del encabezado
const wsExt = XLSX.utils.aoa_to_sheet([
  ['PROYECTO SEGURIDAD CIUDADANA'],
  ['PLANTA EXTERNA - FRENTE NORTE'],
  ['Fecha de corte: 2026-07-31'],
  headers,
  ['2026-07-18', 'EXT', 'PE-01', 'Excavación', 120, 46, 'En progreso', '', ''],
  ['2026-07-25', 'EXT', 'PE-03', 'Llenado', 80, 31, 'Con retraso', '', 'Logística'],
  ['2026-07-28', 'EXT', 'PE-07', 'Instalación y montaje', 95, 36, 'En progreso', '', ''],
]);
XLSX.utils.book_append_sheet(wb, wsExt, 'EXTERNA');

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
import fs from 'node:fs';
fs.writeFileSync('_multi.xlsx', buf);
console.log('multi-sheet xlsx escrito', buf.length, 'bytes');