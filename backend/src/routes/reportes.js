import { Router } from 'express';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { db } from '../lib/db.js';
import { actividadesConProgreso } from '../lib/progress.js';
import { currentByActivity } from '../lib/progress.js';

const router = Router();

function kpiGlobal(data) {
  const totalUnidades = data.reduce((a, d) => a + (d.total_unidades || 0), 0) || 1;
  const ponderado = data.reduce((a, d) => a + (d.pct * (d.total_unidades || 1)), 0);
  return Math.round((ponderado / totalUnidades) * 10) / 10;
}

router.get('/ejecutivo.pdf', (req, res) => {
  const data = actividadesConProgreso({});
  const prog = currentByActivity();
  const avance = kpiGlobal(data);
  const completadas = data.filter((d) => d.estado === 'Completado').length;
  const retrasos = data.filter((d) => d.estado === 'Con retraso').length;

  const causas = db.prepare(`
    SELECT cr.nombre AS causa, COUNT(*) AS frecuencia
    FROM avances av JOIN causas_retraso cr ON cr.id = av.causa_retraso_id
    GROUP BY cr.nombre ORDER BY frecuencia DESC`).all();

  const comparativo = db.prepare(`
    SELECT a.codigo, a.nombre, a.ubicacion_id, (SELECT porcentaje_avance FROM avance_actual WHERE actividad_id=a.id AND sub_actividad_id IS NULL ORDER BY id DESC LIMIT 1) AS pct
    FROM actividades a WHERE a.codigo LIKE 'COSC-%' OR a.codigo LIKE 'PAR-%'`).all();

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte_ejecutivo.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('REPORTE EJECUTIVO - SEGURIDAD CIUDADANA', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text('Generado el ' + new Date().toLocaleDateString('es-ES'), { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).fillColor('#000').text('1. RESUMEN GENERAL');
  doc.moveDown(0.3);
  const rows = [
    ['Avance global del proyecto', avance + '%'],
    ['Actividades completadas', completadas + ' / ' + data.length],
    ['Actividades con retraso', String(retrasos)],
  ];
  rows.forEach(([k, v]) => { doc.fontSize(10).text(`${k}:  ${v}`); });
  doc.moveDown();

  doc.fontSize(12).text('2. AVANCE POR ACTIVIDAD');
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#555').text('Código     Actividad                                  Ubicación    Avance    Estado');
  doc.moveDown(0.1);
  doc.fillColor('#000');
  data.forEach((d) => {
    const ubi = d.ubicacion === 'COSC' ? 'COSC' : d.ubicacion === 'PAR' ? 'PAR' : 'EXT';
    doc.fontSize(8).text(`${d.codigo.padEnd(10)}  ${d.nombre.padEnd(42).slice(0, 42)}  ${ubi.padEnd(6)}    ${String(d.pct + '%').padEnd(8)}  ${d.estado}`);
  });
  doc.moveDown();

  doc.fontSize(12).text('3. ANÁLISIS DE CAUSAS');
  doc.moveDown(0.3);
  doc.fontSize(9);
  causas.forEach((c) => doc.text(`${c.causa}: ${c.frecuencia} registros`));

  doc.end();
});

router.get('/detallado.xlsx', (req, res) => {
  const rows = db.prepare(`
    SELECT av.fecha, u.codigo AS ubicacion, a.codigo AS actividad, a.nombre AS actividad_nombre,
           sa.nombre AS sub_actividad, av.cantidad_realizada, av.porcentaje_avance AS pct,
           av.estado, av.observaciones, cr.nombre AS causa, av.usuario_registro, av.fecha_registro
    FROM avances av
    JOIN actividades a ON a.id = av.actividad_id
    JOIN ubicaciones u ON u.id = a.ubicacion_id
    LEFT JOIN sub_actividades sa ON sa.id = av.sub_actividad_id
    LEFT JOIN causas_retraso cr ON cr.id = av.causa_retraso_id
    ORDER BY av.fecha DESC`).all();

  const header = ['Fecha', 'Ubicación', 'Actividad', 'Actividad Nombre', 'Sub-actividad', 'Cantidad', '% Avance', 'Estado', 'Observaciones', 'Causa', 'Usuario', 'Registro'];
  const aoa = [header, ...rows.map((r) => [r.fecha, r.ubicacion, r.actividad, r.actividad_nombre, r.sub_actividad, r.cantidad_realizada, r.pct, r.estado, r.observaciones, r.causa, r.usuario_registro, r.fecha_registro])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Avances');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="registros_avances.xlsx"');
  res.send(buf);
});

const fmtSoles = (n) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => Math.round((Number(n) || 0) * 100) / 100;

router.get('/material.pdf', (req, res) => {
  const rows = db.prepare('SELECT * FROM material ORDER BY area, categoria, id').all();

  const porArea = {};
  for (const r of rows) {
    if (!porArea[r.area]) porArea[r.area] = { importe: 0, cant: 0, activos: 0, inactivos: 0, categorias: {} };
    const A = porArea[r.area];
    const activo = r.activo !== 0;
    if (activo) { A.activos++; A.cant = Math.round((A.cant + (r.cantidad || 0)) * 10) / 10; A.importe = Math.round((A.importe + (r.cantidad || 0) * (r.precio_unit || 0)) * 100) / 100; }
    else A.inactivos++;
    if (!A.categorias[r.categoria]) A.categorias[r.categoria] = { items: [], importe: 0 };
    const C = A.categorias[r.categoria];
    if (activo) C.importe = Math.round((C.importe + (r.cantidad || 0) * (r.precio_unit || 0)) * 100) / 100;
    C.items.push({ ...r, _activo: activo });
  }

  const areas = Object.entries(porArea).sort((a, b) => a[0].localeCompare(b[0]));
  const total = { importe: 0, cant: 0, activos: 0, inactivos: 0 };
  for (const [, A] of areas) { total.importe += A.importe; total.cant += A.cant; total.activos += A.activos; total.inactivos += A.inactivos; }

  const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="material_faltante.pdf"');
  doc.pipe(res);

  const M = 40;
  const BORDE = 595 - M * 2;
  let y = 0;
  const fechaStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.on('pageAdded', () => {
    doc.fontSize(7).fillColor('#94a3b8')
      .text('SEGURIDAD CIUDADANA · Reporte de Material Faltante · ' + fechaStr + ' · Página ' + doc.page, M, 790, { width: BORDE, align: 'center' });
  });

  const suficiente = (h) => { if (y + h > 780) { doc.addPage(); y = 50; } };

  // portada / cabecera institucional
  doc.rect(0, 0, 595, 78).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(17, 17).text('REPORTE DE MATERIAL FALTANTE', M, 16, { width: BORDE, align: 'center' });
  doc.fontSize(9).fillColor('#cbd5e1').text('PROYECTO SEGURIDAD CIUDADANA · Planta Interna COSC / PAR · Planta Externa', M, 40, { width: BORDE, align: 'center' });
  doc.fontSize(8).fillColor('#94a3b8').text('Generado el ' + fechaStr, M, 56, { width: BORDE, align: 'center' });
  y = 96;

  // resumen ejecutivo
  suficiente(70);
  doc.rect(M, y, BORDE, 66).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
  doc.fontSize(9).fillColor('#0f172a').text('RESUMEN', M + 10, y + 8);
  doc.fillColor('#475569');
  let bx = M + 10;
  const bw = (BORDE - 20 - 2 * 12) / 3;
  for (const [nombre, A] of areas) {
    doc.rect(bx, y + 20, bw, 36).fill('#ffffff').strokeColor('#e2e8f0').stroke();
    doc.fontSize(6.5).fillColor('#64748b').text(String(nombre).toUpperCase(), bx + 6, y + 23, { width: bw - 12 });
    doc.fontSize(11).fillColor('#0f172a').text('S/ ' + fmtSoles(A.importe), bx + 6, y + 32, { width: bw - 12 });
    doc.fontSize(6).fillColor('#94a3b8').text(A.activos + ' refs · ' + fmtNum(A.cant) + ' uni', bx + 6, y + 46, { width: bw - 12 });
    bx += bw + 12;
  }
  y += 70;

  // tarjeta de total
  suficiente(34);
  doc.rect(M, y, BORDE, 28).fill('#047857');
  doc.fillColor('#ffffff').fontSize(8).text('IMPORTE TOTAL REQUERIDO (ÍTEMS ACTIVOS)', M + 10, y + 5);
  doc.fontSize(13).text('S/ ' + fmtSoles(total.importe), M + 10, y + 12);
  doc.fontSize(7).fillColor('#d1fae5').text(fmtNum(total.cant) + ' unidades · ' + total.activos + ' referencias' + (total.inactivos ? ' · ' + total.inactivos + ' desactivadas' : ''), M + BORDE - 10, y + 8, { align: 'right', width: 200 });
  y += 38;

  const COL = {
    material: { x: M + 3, w: 172 },
    modelo: { x: M + 3 + 172, w: 126 },
    cant: { x: M + 3 + 172 + 126, w: 44 },
    und: { x: M + 3 + 172 + 126 + 44, w: 44 },
    precio: { x: M + 3 + 172 + 126 + 44 + 44, w: 68 },
    importe: { x: M + 3 + 172 + 126 + 44 + 44 + 68, w: BORDE - 3 - 172 - 126 - 44 - 44 - 68 },
  };

  const filaHeader = () => {
    suficiente(18);
    doc.rect(M, y, BORDE, 18).fill('#1e3a8a');
    doc.fontSize(7.5).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('MATERIAL', COL.material.x, y + 5, { width: COL.material.w });
    doc.text('MODELO / MARCA', COL.modelo.x, y + 5, { width: COL.modelo.w });
    doc.text('CANT.', COL.cant.x, y + 5, { width: COL.cant.w, align: 'right' });
    doc.text('UND', COL.und.x, y + 5, { width: COL.und.w, align: 'right' });
    doc.text('PRECIO UNIT.', COL.precio.x, y + 5, { width: COL.precio.w, align: 'right' });
    doc.text('IMPORTE', COL.importe.x, y + 5, { width: COL.importe.w, align: 'right' });
    doc.font('Helvetica');
    y += 18;
  };

  const filaTot = (texto, importe) => {
    suficiente(18);
    doc.rect(M, y, BORDE, 18).fill('#f1f5f9');
    doc.fontSize(8).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text(texto, M + 8, y + 5, { width: BORDE - 8 - COL.importe.w - 40 });
    doc.text('S/ ' + fmtSoles(importe), COL.importe.x, y + 5, { width: COL.importe.w - 3, align: 'right' });
    doc.font('Helvetica');
    y += 18;
  };

  const celda = (c, color) => {
    const h = Math.max(...c.map((c2) => doc.heightOfString(String(c2.t), { width: c2.w - 6 }))) + 7;
    suficiente(h);
    if (color) doc.rect(M, y, BORDE, h).fill(color);
    doc.fontSize(7.5).fillColor('#111827');
    for (const c2 of c) {
      doc.text(String(c2.t), c2.x + 3, y + 3.5, { width: c2.w - 6, align: c2.align || 'left' });
    }
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(M, y + h).lineTo(M + BORDE, y + h).stroke();
    y += h;
  };

  for (const [nombre, A] of areas) {
    suficiente(26);
    // cabecera de área
    doc.rect(M, y, BORDE, 22).fill('#0ea5e9');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('ÁREA: ' + nombre, M + 8, y + 6);
    doc.font('Helvetica').fontSize(7).fillColor('#e0f2fe').text('S/ ' + fmtSoles(A.importe), M + BORDE - 10, y + 6, { width: 120, align: 'right' });
    y += 26;

    const cats = Object.entries(A.categorias);
    let filaColor = '#ffffff';
    cats.forEach(([cat, C], ci) => {
      const activos = C.items.filter((i) => i._activo);
      if (!activos.length) return;
      suficiente(18);
      // título de categoría
      doc.rect(M, y, BORDE, 16).fill(ci % 2 ? '#f8fafc' : '#eef2ff');
      doc.fontSize(7.5).fillColor('#334155').font('Helvetica-Oblique').text(cat.toUpperCase(), M + 8, y + 4);
      doc.font('Helvetica');
      y += 16;

      filaHeader();
      filaColor = '#ffffff';
      for (const it of activos) {
        const filaFondo = filaColor;
        filaColor = filaFondo === '#ffffff' ? '#f8fafc' : '#ffffff';
        celda([
          { t: it.material, x: COL.material.x, w: COL.material.w },
          { t: it.modelo || '—', x: COL.modelo.x, w: COL.modelo.w },
          { t: fmtNum(it.cantidad), x: COL.cant.x, w: COL.cant.w, align: 'right' },
          { t: it.unidad || 'und', x: COL.und.x, w: COL.und.w, align: 'right' },
          { t: it.precio_unit ? fmtSoles(it.precio_unit) : '—', x: COL.precio.x, w: COL.precio.w, align: 'right' },
          { t: (it.cantidad || 0) * (it.precio_unit || 0) ? 'S/ ' + fmtSoles((it.cantidad || 0) * (it.precio_unit || 0)) : '—', x: COL.importe.x, w: COL.importe.w, align: 'right' },
        ], filaFondo);
      }
      filaTot('TOTAL ' + cat.toUpperCase(), C.importe);
      suficiente(8); y += 6;
    });
    filaTot('TOTAL ' + nombre, A.importe);
    y += 8;
  }

  doc.end();
});

export default router;