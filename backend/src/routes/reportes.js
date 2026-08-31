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

// ---------- REPORTE PDF DE FALTANTES DE OBRA ----------
router.get('/faltantes-obra.pdf', (req, res) => {
  const area = req.query.area;
  const where = area && area !== 'TODAS' ? 'WHERE area = ?' : '';
  const rows = db.prepare(
    `SELECT * FROM obra_items ${where} ORDER BY area, grupo, codigo`
  ).all(...(where ? [area] : []));

  function analizarDias(dias) {
    const s = String(dias || '').trim();
    if (!s) return null;
    const nums = (s.match(/\d+/g) || []).map(Number);
    if (!nums.length) return null;
    return { inicio: Math.min(...nums), fin: Math.max(...nums), span: Math.max(1, Math.max(...nums) - Math.min(...nums) + 1) };
  }
  function estadoConf(o) {
    if (o.config_estado) return o.config_estado;
    if (!o.dias_config || !String(o.dias_config).trim()) return 'no_aplica';
    return o.configurado ? 'completado' : 'pendiente';
  }
  function calcular(o) {
    const di = analizarDias(o.dias);
    const dc = analizarDias(o.dias_config);
    const dias_inst = di ? di.span : 0;
    const dias_conf = dc ? dc.span : 0;
    const pct_inst = o.cantidad_total > 0 ? Math.min(100, (o.cantidad_real / o.cantidad_total) * 100) : 0;
    const est = estadoConf(o);
    const noAplica = est === 'no_aplica';
    const confCompleta = est === 'completado';
    const pct_conf = confCompleta && !noAplica ? 100 : 0;
    const wInst = dias_inst;
    let wConf = 0;
    if (!noAplica) { wConf = dias_conf > 0 ? dias_conf : 1; }
    const wSum = wInst + wConf;
    const pct = wSum > 0 ? (pct_inst * wInst + pct_conf * wConf) / wSum : pct_inst;
    const estado = pct >= 99 ? 'Completado' : pct > 0 ? 'En progreso' : 'Pendiente';
    return { pct_inst: Math.round(pct_inst * 10) / 10, pct: Math.round(pct * 10) / 10, estado, config_estado: est };
  }

  const porArea = {};
  let totalItems = 0, totalFaltaInst = 0, totalFaltaConf = 0;

  for (const r of rows) {
    const f = calcular(r);
    const faltaInst = Math.round(Math.max(0, r.cantidad_total - r.cantidad_real) * 10) / 10;
    const confEst = f.config_estado;
    const faltaConf = (confEst === 'pendiente' || confEst === 'aplica')
      ? Math.round(Math.max(0, r.cantidad_total - r.cantidad_real) * 10) / 10 : 0;
    if (faltaInst <= 0 && faltaConf <= 0) continue;

    if (!porArea[r.area]) porArea[r.area] = { grupos: {} };
    const A = porArea[r.area];
    if (!A.grupos[r.grupo]) A.grupos[r.grupo] = [];
    A.grupos[r.grupo].push({
      codigo: r.codigo, descripcion: r.descripcion, unidad: r.unidad,
      cantidad_total: r.cantidad_total, cantidad_real: r.cantidad_real,
      faltaInst, faltaConf, pct: f.pct, config_estado: confEst,
    });
    totalItems++;
    totalFaltaInst = Math.round((totalFaltaInst + faltaInst) * 10) / 10;
    totalFaltaConf = Math.round((totalFaltaConf + faltaConf) * 10) / 10;
  }

  const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true, autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="faltantes_obra.pdf"');
  doc.pipe(res);

  const M = 36;
  const BORDE = 595 - M * 2;
  let y = 0;
  const fechaStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.on('pageAdded', () => {
    doc.fontSize(7).fillColor('#94a3b8')
      .text('SEGURIDAD CIUDADANA · Reporte de Faltantes de Obra · ' + fechaStr + ' · Página ' + doc.page, M, 790, { width: BORDE, align: 'center' });
  });

  const suficiente = (h) => { if (y + h > 775) { doc.addPage(); y = 50; } };

  // Header institucional
  doc.rect(0, 0, 595, 78).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(17).text('REPORTE DE FALTANTES DE OBRA', M, 16, { width: BORDE, align: 'center' });
  doc.fontSize(9).fillColor('#cbd5e1').text('PROYECTO SEGURIDAD CIUDADANA · Planta Interna COSC / PAR · Planta Externa', M, 40, { width: BORDE, align: 'center' });
  doc.fontSize(8).fillColor('#94a3b8').text('Generado el ' + fechaStr, M, 56, { width: BORDE, align: 'center' });
  y = 96;

  // Resumen general
  suficiente(50);
  doc.rect(M, y, BORDE, 44).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
  doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text('RESUMEN GENERAL', M + 10, y + 6);
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  doc.text(`Ítems con faltante: ${totalItems}`, M + 10, y + 20);
  doc.text(`Faltante instalación: ${totalFaltaInst} unidades`, M + 200, y + 20);
  doc.text(`Faltante configuración: ${totalFaltaConf} unidades`, M + 400, y + 20);
  y += 48;

  // Resumen por área
  const areas = Object.entries(porArea).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [areaName, A] of areas) {
    const areaItems = Object.values(A.grupos).flat();
    const areaFaltaInst = areaItems.reduce((s, i) => s + i.faltaInst, 0);
    const areaFaltaConf = areaItems.reduce((s, i) => s + i.faltaConf, 0);

    suficiente(30);
    doc.rect(M, y, BORDE, 24).fill('#0ea5e9');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
      .text(areaName, M + 10, y + 6, { width: BORDE - 200 });
    doc.fontSize(8).fillColor('#e0f2fe')
      .text(`${areaItems.length} ítems · Falta Inst: ${Math.round(areaFaltaInst * 10) / 10} · Falta Conf: ${Math.round(areaFaltaConf * 10) / 10}`, M + BORDE - 10, y + 6, { width: 200, align: 'right' });
    y += 28;

    const COL = {
      codigo: { x: M + 3, w: 52 },
      desc: { x: M + 55, w: 155 },
      unidad: { x: M + 210, w: 36 },
      total: { x: M + 246, w: 40 },
      real: { x: M + 286, w: 40 },
      faltaInst: { x: M + 326, w: 50 },
      config: { x: M + 376, w: 56 },
      faltaConf: { x: M + 432, w: 50 },
      avance: { x: M + 482, w: BORDE - 482 - 3 },
    };

    const filaHeader = () => {
      suficiente(18);
      doc.rect(M, y, BORDE, 18).fill('#1e3a8a');
      doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('CÓDIGO', COL.codigo.x, y + 5, { width: COL.codigo.w });
      doc.text('DESCRIPCIÓN', COL.desc.x, y + 5, { width: COL.desc.w });
      doc.text('UND', COL.unidad.x, y + 5, { width: COL.unidad.w, align: 'center' });
      doc.text('TOTAL', COL.total.x, y + 5, { width: COL.total.w, align: 'right' });
      doc.text('REAL', COL.real.x, y + 5, { width: COL.real.w, align: 'right' });
      doc.text('FALTA INST.', COL.faltaInst.x, y + 5, { width: COL.faltaInst.w, align: 'right' });
      doc.text('CONFIG.', COL.config.x, y + 5, { width: COL.config.w, align: 'center' });
      doc.text('FALTA CONF.', COL.faltaConf.x, y + 5, { width: COL.faltaConf.w, align: 'right' });
      doc.text('% AVANCE', COL.avance.x, y + 5, { width: COL.avance.w, align: 'right' });
      doc.font('Helvetica');
      y += 18;
    };

    const grupos = Object.entries(A.grupos).sort((a, b) => a[0].localeCompare(b[0]));
    let filaColor = '#ffffff';

    for (const [grupoName, items] of grupos) {
      suficiente(20);
      doc.rect(M, y, BORDE, 16).fill('#f1f5f9');
      doc.fontSize(7.5).fillColor('#334155').font('Helvetica-Oblique')
        .text(grupoName || '(Sin grupo)', M + 8, y + 4, { width: BORDE - 16 });
      doc.font('Helvetica');
      y += 16;

      filaHeader();
      filaColor = '#ffffff';

      for (const it of items) {
        const filaFondo = filaColor;
        filaColor = filaFondo === '#ffffff' ? '#f8fafc' : '#ffffff';
        const h = 14;
        suficiente(h);
        if (filaFondo !== '#ffffff') doc.rect(M, y, BORDE, h).fill(filaFondo);
        doc.fontSize(7).fillColor('#111827');
        doc.text(it.codigo || '', COL.codigo.x + 3, y + 3, { width: COL.codigo.w - 6 });
        doc.text((it.descripcion || '').slice(0, 40), COL.desc.x + 3, y + 3, { width: COL.desc.w - 6 });
        doc.text(it.unidad || '', COL.unidad.x, y + 3, { width: COL.unidad.w, align: 'center' });
        doc.text(String(it.cantidad_total || 0), COL.total.x, y + 3, { width: COL.total.w - 3, align: 'right' });
        doc.text(String(it.cantidad_real || 0), COL.real.x, y + 3, { width: COL.real.w - 3, align: 'right' });
        doc.fillColor(it.faltaInst > 0 ? '#dc2626' : '#111827')
          .text(String(it.faltaInst || '—'), COL.faltaInst.x, y + 3, { width: COL.faltaInst.w - 3, align: 'right' });
        const confLabel = it.config_estado === 'completado' ? 'OK' : it.config_estado === 'pendiente' ? 'Pend.' : it.config_estado === 'aplica' ? 'Sí' : '—';
        doc.fillColor('#111827').text(confLabel, COL.config.x, y + 3, { width: COL.config.w, align: 'center' });
        doc.fillColor(it.faltaConf > 0 ? '#dc2626' : '#111827')
          .text(String(it.faltaConf || '—'), COL.faltaConf.x, y + 3, { width: COL.faltaConf.w - 3, align: 'right' });
        doc.fillColor('#111827').text(it.pct + '%', COL.avance.x, y + 3, { width: COL.avance.w - 3, align: 'right' });
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(M, y + h).lineTo(M + BORDE, y + h).stroke();
        y += h;
      }

      // Subtotal por grupo
      const gFaltaInst = items.reduce((s, i) => s + i.faltaInst, 0);
      const gFaltaConf = items.reduce((s, i) => s + i.faltaConf, 0);
      suficiente(16);
      doc.rect(M, y, BORDE, 16).fill('#e2e8f0');
      doc.fontSize(7).fillColor('#0f172a').font('Helvetica-Bold');
      doc.text(`Subtotal ${grupoName || '(Sin grupo)'}`, M + 8, y + 4, { width: 200 });
      doc.text(`Falta Inst: ${Math.round(gFaltaInst * 10) / 10}`, COL.faltaInst.x - 40, y + 4, { width: 100, align: 'right' });
      doc.text(`Falta Conf: ${Math.round(gFaltaConf * 10) / 10}`, COL.faltaConf.x, y + 4, { width: COL.faltaConf.w, align: 'right' });
      doc.font('Helvetica');
      y += 16;
    }

    // Total área
    suficiente(18);
    doc.rect(M, y, BORDE, 18).fill('#0ea5e9');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text(`TOTAL ${areaName}`, M + 8, y + 5, { width: 200 });
    doc.text(`Falta Inst: ${Math.round(areaFaltaInst * 10) / 10}`, COL.faltaInst.x - 40, y + 5, { width: 100, align: 'right' });
    doc.text(`Falta Conf: ${Math.round(areaFaltaConf * 10) / 10}`, COL.faltaConf.x, y + 5, { width: COL.faltaConf.w, align: 'right' });
    doc.font('Helvetica');
    y += 22;
  }

  // Total general
  suficiente(22);
  doc.rect(M, y, BORDE, 20).fill('#0f172a');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('TOTAL GENERAL', M + 8, y + 5, { width: 200 });
  doc.text(`${totalItems} ítems`, M + 200, y + 5, { width: 100 });
  doc.text(`Falta Inst: ${totalFaltaInst}`, M + 320, y + 5, { width: 120, align: 'right' });
  doc.text(`Falta Conf: ${totalFaltaConf}`, M + 450, y + 5, { width: BORDE - 450 - 3, align: 'right' });
  doc.font('Helvetica');

  doc.end();
});

export default router;