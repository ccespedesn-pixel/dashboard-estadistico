import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../lib/db.js';

const router = Router();

const M = 50;
const BORDE = 595 - M * 2;
const fechaLarga = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaCorta = () => new Date().toLocaleDateString('es-ES');

function headerInstitucional(doc, titulo) {
  doc.rect(0, 0, 595, 80).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('PROYECTO SEGURIDAD CIUDADANA', M, 14, { width: BORDE, align: 'center' });
  doc.fontSize(12).font('Helvetica').text(titulo, M, 36, { width: BORDE, align: 'center' });
  doc.fontSize(8).fillColor('#94a3b8').text('COSC · PAR · Planta Externa', M, 56, { width: BORDE, align: 'center' });
  doc.fontSize(7).fillColor('#64748b').text('Generado el ' + fechaLarga(), M, 68, { width: BORDE, align: 'center' });
  doc.font('Helvetica');
  return 96;
}

function footer(doc) {
  doc.fontSize(7).fillColor('#94a3b8')
    .text('SEGURIDAD CIUDADANA · Documentación de Calidad · ' + fechaCorta() + ' · Pág. ' + doc.page, M, 790, { width: BORDE, align: 'center' });
}

function seccion(doc, titulo, y) {
  if (y > 700) { doc.addPage(); y = 50; }
  doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text(titulo, M, y);
  doc.moveTo(M, y + 14).lineTo(M + BORDE, y + 14).strokeColor('#3b82f6').lineWidth(1).stroke();
  doc.font('Helvetica');
  return y + 22;
}

function tablaSimple(doc, headers, rows, startY, colWidths) {
  let y = startY;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  // Header
  doc.rect(M, y, BORDE, 16).fill('#1e3a8a');
  doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
  let x = M + 4;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4, { width: colWidths[i] - 4 });
    x += colWidths[i];
  });
  doc.font('Helvetica').fillColor('#111827');
  y += 16;
  // Rows
  rows.forEach((row, ri) => {
    const h = 14;
    if (y + h > 780) { doc.addPage(); y = 50; footer(doc); }
    if (ri % 2) doc.rect(M, y, BORDE, h).fill('#f8fafc');
    doc.fontSize(7).fillColor('#111827');
    x = M + 4;
    row.forEach((cell, ci) => {
      doc.text(String(cell ?? ''), x, y + 3, { width: colWidths[ci] - 4 });
      x += colWidths[ci];
    });
    doc.strokeColor('#e2e8f0').lineWidth(0.3).moveTo(M, y + h).lineTo(M + BORDE, y + h).stroke();
    y += h;
  });
  return y;
}

// ---------- 1. ÍNDICE GENERAL ----------
router.get('/01-indice', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="01_indice_general.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'ÍNDICE GENERAL DEL DOSSIER DE CALIDAD');
  y = seccion(doc, 'ESTRUCTURA DEL DOCUMENTO', y);

  const capitulos = [
    ['01', 'Índice General', 'Índice actual del dossier'],
    ['02', 'Memoria Descriptiva', 'Descripción general del proyecto'],
    ['03', 'Hoja de Contactos', 'Información de contacto del proyecto'],
    ['04', 'Carta de Garantía de Empresa', 'Garantía de la empresa contratista'],
    ['05', 'Descripción de Partidas/Servicios', 'Detalle de cada partida y alcance'],
    ['06', 'Panel Fotográfico', 'Registro fotográfico de ejecución'],
    ['07', 'Actas de Entrega', 'Actas de recepción de equipos/obras'],
    ['08', 'Guías de Materiales', 'Guías de remisión y recepción'],
    ['09', 'Certificados de Calidad', 'Certificados de materiales y procesos'],
    ['10', 'Carta de Garantía de Equipos', 'Garantía de equipos instalados'],
    ['11', 'Fichas Técnicas', 'Cuadros de cumplimiento técnico'],
    ['12', 'Manual O&M', 'Manual de operación y mantenimiento'],
    ['13', 'Protocolos de Pruebas', 'Procedimientos y resultados de pruebas'],
    ['14', 'Licencias de Software', 'Licencias de software utilizado'],
    ['15', 'Certificado de Calibración', 'Calibración de equipos de medición'],
    ['16', 'Planos As Built', 'Planos finales de la obra ejecutada'],
    ['17', 'Certificados de Capacitación', 'Capacitación al personal'],
    ['18', 'Documentación SSOMA', 'Seguridad y salud en el trabajo'],
    ['19', 'Diagramas de Red y Credenciales', 'Topología de red y accesos'],
    ['20', 'Cierre y Conformidad', 'Acta de cierre del proyecto'],
  ];

  const colW = [30, 180, BORDE - 210];
  y = tablaSimple(doc, ['N°', 'CAPÍTULO', 'CONTENIDO'], capitulos, y, colW);

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#475569').text('Este dossier contiene toda la documentación técnica y administrativa del proyecto de Seguridad Ciudadana, organizada conforme a los estándares de calidad establecidos.', M, y + 10, { width: BORDE });

  footer(doc);
  doc.end();
});

// ---------- 2. MEMORIA DESCRIPTIVA ----------
router.get('/02-memoria', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="02_memoria_descriptiva.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'MEMORIA DESCRIPTIVA');

  y = seccion(doc, '1. OBJETO DEL PROYECTO', y);
  doc.fontSize(9).fillColor('#334155').text(
    'El presente proyecto tiene por objeto el suministro, instalación, configuración y puesta en marcha del sistema de Seguridad Ciudadana, comprendiendo videovigilancia, control de acceso, megafonía IP, fibra óptica e infraestructura eléctrica en las áreas de Planta Interna (COSC y PAR) y Planta Externa.',
    M, y, { width: BORDE, lineGap: 4 }
  );
  y += 60;

  y = seccion(doc, '2. ALCANCE', y);
  const alcance = [
    'Planta Externa: Cámaras IP (fijas, PTZ, panorámicas, LPR, facial, móviles), botones de pánico, megáfonos IP, fibra óptica, postes, puesta a tierra, sistema eléctrico.',
    'Planta Interna COSC: Equipos de red, servidores, switches, cableado estructurado, racks.',
    'Planta Interna PAR: Equipos de comunicaciones, distribución de red.',
  ];
  alcance.forEach((a) => { doc.fontSize(9).text('• ' + a, M + 10, y, { width: BORDE - 20, lineGap: 3 }); y += 28; });
  y += 10;

  y = seccion(doc, '3. UBICACIONES', y);
  const locs = db.prepare('SELECT * FROM ubicaciones').all();
  locs.forEach((l) => { doc.fontSize(9).text(`• ${l.nombre} (${l.codigo}): ${l.descripcion || 'Sin descripción'}`, M + 10, y, { width: BORDE - 20 }); y += 16; });
  y += 10;

  y = seccion(doc, '4. PARTIDAS PRINCIPALES', y);
  const items = db.prepare('SELECT area, COUNT(*) as n FROM obra_items GROUP BY area ORDER BY area').all();
  items.forEach((i) => { doc.fontSize(9).text(`• ${i.area}: ${i.n} partidas`, M + 10, y, { width: BORDE - 20 }); y += 16; });
  y += 10;

  y = seccion(doc, '5. ESTADO ACTUAL', y);
  const stats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN cantidad_real >= cantidad_total THEN 1 ELSE 0 END) as completados FROM obra_items').get();
  doc.fontSize(9).text(`Total de partidas: ${stats.total}`, M + 10, y, { width: BORDE }); y += 14;
  doc.text(`Completadas: ${stats.completados}`, M + 10, y, { width: BORDE }); y += 14;
  doc.text(`En progreso/Pendientes: ${stats.total - stats.completados}`, M + 10, y, { width: BORDE }); y += 14;

  footer(doc);
  doc.end();
});

// ---------- 3. HOJA DE CONTACTOS ----------
router.get('/03-contactos', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="03_hoja_contactos.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'HOJA DE CONTACTOS');

  y = seccion(doc, 'EQUIPO DEL PROYECTO', y);
  const contactos = [
    ['Director de Proyecto', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Gerente de Operaciones', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Ingeniero Residente', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Supervisor de Instalaciones', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Especialista en Redes', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Técnico de Soporte', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
    ['Responsable SSOMA', '[Nombre]', '[correo@empresa.com]', '[+51 999 999 999]'],
  ];

  const colW = [130, 130, 150, BORDE - 410];
  y = tablaSimple(doc, ['CARGO', 'NOMBRE', 'CORREO', 'TELÉFONO'], contactos, y, colW);

  y += 20;
  y = seccion(doc, 'CONTACTOS DE EMERGENCIA', y);
  const emergencia = [
    ['Bomberos', '116'],
    ['Policía Nacional', '105'],
    ['SAMU', '117'],
    ['Defensa Civil', '115'],
  ];
  y = tablaSimple(doc, ['SERVICIO', 'TELÉFONO'], emergencia, y, [200, BORDE - 200]);

  footer(doc);
  doc.end();
});

// ---------- 4. CARTA DE GARANTÍA DE EMPRESA ----------
router.get('/04-garantia-empresa', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="04_carta_garantia_empresa.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CARTA DE GARANTÍA DE EMPRESA');

  y = seccion(doc, 'GARANTÍA DE CALIDAD', y);
  doc.fontSize(9).fillColor('#334155').text(
    'La empresa [RAZÓN SOCIAL DEL CONTRATISTA], identificada con RUC N° [RUC], constituida legalmente según las leyes de la República del Perú, con domicilio en [DIRECCIÓN COMPLETA], en su calidad de contratista del proyecto "Seguridad Ciudadana",declara bajo juramento que:',
    M, y, { width: BORDE, lineGap: 4 }
  );
  y += 60;

  const garantias = [
    '1. Los materiales y equipos suministrados son nuevos, originales y cumple con las especificaciones técnicas aprobadas.',
    '2. La instalación se ha realizado conforme a las normas técnicas vigentes y los planos aprobados.',
    '3. Se otorga garantía de [X] meses para equipos y [X] meses para instalación, contados a partir de la fecha de recepción.',
    '4. Durante el periodo de garantía, la empresa se compromete a reemplazar o reparar sin costo cualquier defecto de material o mano de obra.',
    '5. La garantía cubre: equipos, cableado, conectividad, configuración y puesta en marcha.',
  ];
  garantias.forEach((g) => {
    doc.fontSize(9).text(g, M + 10, y, { width: BORDE - 20, lineGap: 3 });
    y += 30;
  });

  y += 30;
  doc.fontSize(9).text('Lugar y fecha: _________________, ' + fechaLarga(), M, y);
  y += 40;
  doc.text('_________________________________', M + 80, y, { width: 200, align: 'center' });
  y += 14;
  doc.fontSize(8).fillColor('#64748b').text('Representante Legal', M + 80, y, { width: 200, align: 'center' });
  y += 14;
  doc.text('[Nombre de la Empresa]', M + 80, y, { width: 200, align: 'center' });

  footer(doc);
  doc.end();
});

// ---------- 5. DESCRIPCIÓN DE PARTIDAS/SERVICIOS ----------
router.get('/05-partidas', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="05_descripcion_partidas.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'DESCRIPCIÓN DE PARTIDAS Y SERVICIOS');

  const areas = db.prepare('SELECT DISTINCT area FROM obra_items ORDER BY area').all();
  for (const { area } of areas) {
    y = seccion(doc, area, y);
    const grupos = db.prepare('SELECT DISTINCT grupo FROM obra_items WHERE area = ? ORDER BY grupo').all(area);
    for (const { grupo } of grupos) {
      if (y > 720) { doc.addPage(); y = 50; footer(doc); }
      doc.fontSize(8).fillColor('#3b82f6').font('Helvetica-Bold').text(grupo || '(Sin grupo)', M + 5, y);
      doc.font('Helvetica');
      y += 12;

      const items = db.prepare('SELECT codigo, descripcion, unidad, cantidad_total, contratista FROM obra_items WHERE area = ? AND grupo = ? ORDER BY codigo').all(area, grupo);
      const rows = items.map((it) => [it.codigo, it.descripcion, it.unidad || 'und', String(it.cantidad_total), it.contratista || '—']);
      const colW = [55, 210, 40, 50, BORDE - 355];
      y = tablaSimple(doc, ['CÓDIGO', 'DESCRIPCIÓN', 'UND', 'CANTIDAD', 'CONTRATISTA'], rows, y, colW);
      y += 6;
    }
  }

  footer(doc);
  doc.end();
});

// ---------- 6. PANEL FOTOGRÁFICO ----------
router.get('/06-panel-fotografico', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="06_panel_fotografico.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'PANEL FOTOGRÁFICO');

  const items = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM obra_fotos WHERE item_id = o.id AND tipo = 'ejecutada') AS fotos_ejec,
      (SELECT COUNT(*) FROM obra_fotos WHERE item_id = o.id AND tipo = 'pendiente') AS fotos_pend
    FROM obra_items o ORDER BY area, grupo, codigo
  `).all();

  const agrupado = {};
  for (const it of items) {
    if (!agrupado[it.area]) agrupado[it.area] = {};
    if (!agrupado[it.area][it.grupo]) agrupado[it.area][it.grupo] = [];
    agrupado[it.area][it.grupo].push(it);
  }

  for (const [area, grupos] of Object.entries(agrupado)) {
    y = seccion(doc, area, y);
    for (const [grupo, itemsG] of Object.entries(grupos)) {
      if (y > 720) { doc.addPage(); y = 50; footer(doc); }
      doc.fontSize(8).fillColor('#3b82f6').font('Helvetica-Bold').text(grupo || '(Sin grupo)', M + 5, y);
      doc.font('Helvetica');
      y += 12;

      for (const it of itemsG) {
        if (y > 740) { doc.addPage(); y = 50; footer(doc); }
        const pct = it.cantidad_total > 0 ? Math.round((it.cantidad_real / it.cantidad_total) * 100) : 0;
        const estado = pct >= 99 ? 'COMPLETADO' : pct > 0 ? 'EN PROGRESO' : 'PENDIENTE';
        doc.fontSize(7).fillColor('#111827').font('Helvetica-Bold')
          .text(`${it.codigo} - ${it.descripcion}`, M + 8, y);
        doc.font('Helvetica').fillColor('#64748b')
          .text(`Estado: ${estado} (${pct}%) | Fotos ejecutadas: ${it.fotos_ejec} | Pendientes: ${it.fotos_pend}`, M + 8, y + 10);
        doc.strokeColor('#e2e8f0').lineWidth(0.3).moveTo(M, y + 20).lineTo(M + BORDE, y + 20).stroke();
        y += 24;
      }
    }
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#64748b').text('Nota: Las fotografías detalladas están disponibles en el sistema web del dashboard. Este documento resume el estado fotográfico por partida.', M, y, { width: BORDE });

  footer(doc);
  doc.end();
});

// ---------- 7. ACTAS DE ENTREGA ----------
router.get('/07-actas-entrega', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="07_actas_entrega.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'ACTAS DE ENTREGA');

  const actas = [
    { n: '001', fecha: '[Fecha]', entrega: '[Equipo/Área]', recibe: '[Nombre]', estado: 'Aprobado' },
    { n: '002', fecha: '[Fecha]', entrega: '[Equipo/Área]', recibe: '[Nombre]', estado: 'Pendiente' },
  ];

  y = seccion(doc, 'REGISTRO DE ACTAS', y);
  const colW = [40, 80, 160, 120, BORDE - 400];
  y = tablaSimple(doc, ['N°', 'FECHA', 'DESCRIPCIÓN ENTREGA', 'RECIBE', 'ESTADO'], actas, y, colW);

  y += 30;
  y = seccion(doc, 'MODELO DE ACTA DE ENTREGA', y);
  doc.fontSize(9).fillColor('#334155');
  const modelo = [
    'ACTA DE ENTREGA N° ___',
    '',
    'En la ciudad de _____________, a los ___ días del mes de _________ de 20___,',
    'se procede a la entrega del siguiente material/equipo:',
    '',
    'Descripción: _________________________________________________',
    'Cantidad: _____________  Marca/Modelo: _____________________',
    'Serie: _________________  Estado: ____________________________',
    '',
    'ENTREGA:                    RECIBE:                    SUPERVISOR:',
    '_________________          _________________          _________________',
    'Nombre:                    Nombre:                    Nombre:',
    'DNI:                       DNI:                       DNI:',
    'Firma:                     Firma:                     Firma:',
  ];
  modelo.forEach((l) => { doc.text(l, M + 10, y, { width: BORDE - 20 }); y += 14; });

  footer(doc);
  doc.end();
});

// ---------- 8. GUÍAS DE MATERIALES ----------
router.get('/08-guias-materiales', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="08_guias_materiales.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'GUÍAS DE MATERIALES');

  y = seccion(doc, 'GUIAS DE REMISIÓN', y);
  const guias = [
    { n: '001', fecha: '[Fecha]', origen: '[Almacén]', destino: '[Obra]', transportista: '[Nombre]', nroGuia: '________' },
  ];
  const colW = [30, 65, 100, 100, 100, BORDE - 395];
  y = tablaSimple(doc, ['N°', 'FECHA', 'ORIGEN', 'DESTINO', 'TRANSPORTISTA', 'N° GUÍA'], guias, y, colW);

  y += 30;
  y = seccion(doc, 'MODELO DE GUÍA DE REMISIÓN', y);
  doc.fontSize(9).fillColor('#334155');
  const modelo = [
    'GUÍA DE REMISIÓN N°: __________',
    'Fecha de emisión: __________',
    'Punto de partida: __________',
    'Punto de llegada: __________',
    '',
    'DESCRIPCIÓN DEL MATERIAL:',
    '┌─────────────────────────────────────────────────────────────┐',
    '│ Item │ Descripción          │ Cant. │ Und. │ Peso/Kg       │',
    '├─────────────────────────────────────────────────────────────┤',
    '│  1   │ ___________________  │ _____ │ ____ │ ____________  │',
    '│  2   │ ___________________  │ _____ │ ____ │ ____________  │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    'Transportista: __________  DNI: __________  Brevete: __________',
    'Remitente: __________  Firma: __________',
    'Destinatario: __________  Firma: __________',
  ];
  modelo.forEach((l) => { doc.fontSize(8).text(l, M + 10, y, { width: BORDE - 20 }); y += 12; });

  footer(doc);
  doc.end();
});

// ---------- 9. CERTIFICADOS DE CALIDAD ----------
router.get('/09-certificados-calidad', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="09_certificados_calidad.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CERTIFICADOS DE CALIDAD');

  y = seccion(doc, 'CERTIFICADOS DE MATERIALES', y);
  doc.fontSize(9).fillColor('#334155').text(
    'A continuación se detallan los certificados de calidad asociados a los materiales y equipos utilizados en el proyecto:',
    M, y, { width: BORDE, lineGap: 3 }
  );
  y += 30;

  const certs = [
    ['Certificado de origen de cámaras IP', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de fibra óptica monomodo', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de cableado estructurado', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de equipos de red', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de sistema eléctrico', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de postes e infraestructura', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de megáfonos IP', '[N° Certificado]', '[Fecha]', '[Estado]'],
    ['Certificado de botones de pánico', '[N° Certificado]', '[Fecha]', '[Estado]'],
  ];
  const colW = [180, 110, 80, BORDE - 370];
  y = tablaSimple(doc, ['CERTIFICADO', 'N° REGISTRO', 'FECHA', 'ESTADO'], certs, y, colW);

  y += 20;
  y = seccion(doc, 'CONTROL DE CALIDAD', y);
  doc.fontSize(9).fillColor('#334155');
  const control = [
    '• Inspección visual de materiales al momento de la recepción',
    '• Verificación de especificaciones técnicas según ficha técnica',
    '• Pruebas de funcionamiento antes de la instalación',
    '• Control dimensional de infraestructura',
    '• Pruebas de conectividad y rendimiento de red',
  ];
  control.forEach((c) => { doc.text(c, M + 10, y, { width: BORDE - 20 }); y += 16; });

  footer(doc);
  doc.end();
});

// ---------- 10. CARTA DE GARANTÍA DE EQUIPOS ----------
router.get('/10-garantia-equipos', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="10_carta_garantia_equipos.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CARTA DE GARANTÍA DE EQUIPOS');

  y = seccion(doc, 'GARANTÍA DE EQUIPOS', y);
  doc.fontSize(9).fillColor('#334155').text(
    'La empresa [RAZÓN SOCIAL] declara que los equipos suministrados en el proyecto de Seguridad Ciudadana cuentan con garantía del fabricante y/o distribuidor autorizado, conforme a los siguientes términos:',
    M, y, { width: BORDE, lineGap: 4 }
  );
  y += 50;

  const equipos = [
    ['Cámaras IP (todas las variantes)', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Switches de red', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Servidores', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Fibra óptica monomodo', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Megáfonos IP', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Botones de pánico', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['UPS / Equipos eléctricos', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
    ['Postes e infraestructura', '[Marca]', '[Modelo]', '[N° Serie]', '[Garantía]'],
  ];
  const colW = [140, 70, 80, 80, BORDE - 370];
  y = tablaSimple(doc, ['EQUIPO', 'MARCA', 'MODELO', 'N° SERIE', 'GARANTÍA'], equipos, y, colW);

  y += 20;
  doc.fontSize(9).fillColor('#334155').text(
    'La garantía cubre defectos de fabricación, materiales y mano de obra. No cubre daños por mal uso, sobretensiones o accidentes. Para hacer válida la garantía, presentar este documento junto con la factura de compra.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 11. FICHAS TÉCNICAS ----------
router.get('/11-fichas-tecnicas', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="11_fichas_tecnicas.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'FICHAS TÉCNICAS Y CUADROS DE CUMPLIMIENTO');

  y = seccion(doc, 'CUADRO DE CUMPLIMIENTO TÉCNICO', y);

  const items = db.prepare('SELECT * FROM obra_items ORDER BY area, codigo').all();
  const rows = items.map((it) => {
    const pct = it.cantidad_total > 0 ? Math.round((it.cantidad_real / it.cantidad_total) * 100) : 0;
    return [it.codigo, it.descripcion.slice(0, 40), it.unidad || 'und', String(it.cantidad_total), String(it.cantidad_real), `${pct}%`];
  });
  const colW = [50, 175, 35, 45, 45, BORDE - 350];
  y = tablaSimple(doc, ['CÓDIGO', 'ESPECIFICACIÓN', 'UND', 'TOTAL', 'INSTALADO', 'CUMPL.'], rows, y, colW);

  y += 20;
  y = seccion(doc, 'RESUMEN DE CUMPLIMIENTO', y);
  const stats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN cantidad_real >= cantidad_total THEN 1 ELSE 0 END) as cumple FROM obra_items').get();
  doc.fontSize(9).fillColor('#334155');
  doc.text(`Total de partidas: ${stats.total}`, M + 10, y); y += 14;
  doc.text(`Cumplen al 100%: ${stats.cumple}`, M + 10, y); y += 14;
  doc.text(`Porcentaje de cumplimiento global: ${stats.total > 0 ? Math.round((stats.cumple / stats.total) * 100) : 0}%`, M + 10, y);

  footer(doc);
  doc.end();
});

// ---------- 12. MANUAL O&M ----------
router.get('/12-manual-om', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="12_manual_om.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'MANUAL DE OPERACIÓN Y MANTENIMIENTO');

  const capitulos = [
    ['1. DESCRIPCIÓN GENERAL DEL SISTEMA', 'Descripción del sistema de videovigilancia, control de acceso y megafonía IP instalado.'],
    ['2. COMPONENTES DEL SISTEMA', 'Listado de equipos: cámaras, switches, servidores, fibra óptica, megáfonos, botones de pánico.'],
    ['3. PROCEDIMIENTOS DE OPERACIÓN', 'Cómo operar el sistema de videovigilancia, consultar grabaciones, gestionar accesos.'],
    ['4. MANTENIMIENTO PREVENTIVO', 'Limpieza de cámaras, revisión de conexiones, actualización de firmware, respaldo de configuraciones.'],
    ['5. MANTENIMIENTO CORRECTIVO', 'Procedimiento ante fallas: diagnóstico, reposición, escalamiento.'],
    ['6. DIAGRAMA DE CONEXIONES', 'Diagrama de red topológico del sistema instalado.'],
    ['7. CONFIGURACIÓN DE RED', 'Esquema de IPs, VLANs, subredes y credenciales de acceso.'],
    ['8. RESPALDO Y RECUPERACIÓN', 'Procedimientos de backup de configuraciones y restauración del sistema.'],
    ['9. SOLUCIÓN DE PROBLEMAS', 'Tabla de síntomas, causas posibles y soluciones.'],
  ];

  capitulos.forEach(([titulo, desc]) => {
    y = seccion(doc, titulo, y);
    doc.fontSize(9).fillColor('#334155').text(desc, M + 10, y, { width: BORDE - 20, lineGap: 3 });
    y += 30;
  });

  footer(doc);
  doc.end();
});

// ---------- 13. PROTOCOLOS DE PRUEBAS ----------
router.get('/13-protocolos-pruebas', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="13_protocolos_pruebas.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'PROTOCOLOS DE PRUEBAS');

  const pruebas = [
    ['1. Prueba de conectividad de fibra óptica', 'Medición de atenuación con OTDR. Valor aceptable: < 0.5 dB/km.', '[Fecha]', '[Resultado]'],
    ['2. Prueba de PoE en cámaras', 'Verificación de suministro eléctrico por cable Ethernet.', '[Fecha]', '[Resultado]'],
    ['3. Prueba de imagen de cámaras', 'Verificación de calidad de imagen, enfoque, zoom.', '[Fecha]', '[Resultado]'],
    ['4. Prueba de megáfonos IP', 'Verificación de audio, volumen, alcance.', '[Fecha]', '[Resultado]'],
    ['5. Prueba de botones de pánico', 'Verificación de activación y respuesta del sistema.', '[Fecha]', '[Resultado]'],
    ['6. Prueba de red de datos', 'Velocidad, latencia, paquetes perdidos.', '[Fecha]', '[Resultado]'],
    ['7. Prueba de puesta a tierra', 'Resistencia de tierra < 5 ohmios.', '[Fecha]', '[Resultado]'],
    ['8. Prueba de sistema eléctrico', 'Voltaje, amperaje, continuidad.', '[Fecha]', '[Resultado]'],
    ['9. Prueba de grabación', 'Verificación de almacenamiento y reproducción.', '[Fecha]', '[Resultado]'],
    ['10. Prueba de integración', 'Prueba completa del sistema operando.', '[Fecha]', '[Resultado]'],
  ];

  const colW = [160, 180, 60, BORDE - 400];
  y = tablaSimple(doc, ['PRUEBA', 'CRITERIO DE ACEPTACIÓN', 'FECHA', 'RESULTADO'], pruebas, y, colW);

  y += 20;
  y = seccion(doc, 'OBSERVACIONES GENERALES', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Todas las pruebas deben ser realizadas por personal calificado y certificado. Los resultados deben ser documentados y archivados como parte del dossier de calidad del proyecto.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 14. LICENCIAS DE SOFTWARE ----------
router.get('/14-licencias', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="14_licencias_software.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'LICENCIAS DE SOFTWARE');

  y = seccion(doc, 'INVENTARIO DE LICENCIAS', y);
  const licencias = [
    ['Sistema Operativo Servidor', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Software de Videovigilancia (VMS)', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Software de Gestión de Red', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Software de Control de Acceso', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Base de Datos', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Antivirus / Seguridad', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
    ['Sistema Operativo Estaciones', '[Fabricante]', '[N° Licencia]', '[Vigencia]', '[Estado]'],
  ];
  const colW = [140, 90, 90, 70, BORDE - 390];
  y = tablaSimple(doc, ['SOFTWARE', 'FABRICANTE', 'N° LICENCIA', 'VIGENCIA', 'ESTADO'], licencias, y, colW);

  y += 20;
  y = seccion(doc, 'POLÍTICA DE LICENCIAMIENTO', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Todas las licencias deben estar vigentes y ser Originales. El inventario debe actualizarse cuando se realicen cambios o actualizaciones de software. Las licencias deben estar disponibles para auditorías.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 15. CERTIFICADO DE CALIBRACIÓN ----------
router.get('/15-calibracion', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="15_calibracion_equipos.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CERTIFICADO DE CALIBRACIÓN DE EQUIPOS DE MEDICIÓN');

  y = seccion(doc, 'EQUIPOS DE MEDICIÓN', y);
  const equipos = [
    ['Multímetro digital', '[Marca]', '[Modelo]', '[N° Serie]', '[Fecha Calibración]', '[Próxima Calibración]'],
    ['Tester de cableado', '[Marca]', '[Modelo]', '[N° Serie]', '[Fecha Calibración]', '[Próxima Calibración]'],
    ['OTDR (Optical Time Domain Reflectometer)', '[Marca]', '[Modelo]', '[N° Serie]', '[Fecha Calibración]', '[Próxima Calibración]'],
    ['Medidor de voltaje', '[Marca]', '[Modelo]', '[N° Serie]', '[Fecha Calibración]', '[Próxima Calibración]'],
    ['Medidor de resistencia de tierra', '[Marca]', '[Modelo]', '[N° Serie]', '[Fecha Calibración]', '[Próxima Calibración]'],
  ];
  const colW = [120, 70, 70, 65, 75, BORDE - 400];
  y = tablaSimple(doc, ['EQUIPO', 'MARCA', 'MODELO', 'N° SERIE', 'FECHA CAL.', 'PRÓX. CAL.'], equipos, y, colW);

  y += 20;
  y = seccion(doc, 'NOTA', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Todos los equipos de medición utilizados en el proyecto deben contar con certificado de calibración vigente, emitido por un laboratorio acreditado. La calibración debe realizarse cada 12 meses o según las especificaciones del fabricante.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 16. PLANOS AS BUILT ----------
router.get('/16-planos', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="16_planos_as_built.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'PLANOS AS BUILT');

  y = seccion(doc, 'LISTADO DE PLANOS', y);
  const planos = [
    ['PL-001', 'Plano de distribución de cámaras Planta Externa', '[Fecha]', '[Estado]'],
    ['PL-002', 'Plano de cableado de fibra óptica', '[Fecha]', '[Estado]'],
    ['PL-003', 'Plano de distribución eléctrica', '[Fecha]', '[Estado]'],
    ['PL-004', 'Plano de puesta a tierra', '[Fecha]', '[Estado]'],
    ['PL-005', 'Plano de distribución de red Planta Interna COSC', '[Fecha]', '[Estado]'],
    ['PL-006', 'Plano de distribución de red Planta Interna PAR', '[Fecha]', '[Estado]'],
    ['PL-007', 'Plano de ubicación de postes', '[Fecha]', '[Estado]'],
    ['PL-008', 'Plano de megáfonos IP', '[Fecha]', '[Estado]'],
    ['PL-009', 'Plano de botones de pánico', '[Fecha]', '[Estado]'],
    ['PL-010', 'Diagrama de conexiones generales', '[Fecha]', '[Estado]'],
  ];
  const colW = [55, 260, 80, BORDE - 395];
  y = tablaSimple(doc, ['CÓDIGO', 'DESCRIPCIÓN DEL PLANO', 'FECHA', 'ESTADO'], planos, y, colW);

  y += 20;
  y = seccion(doc, 'OBSERVACIONES', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Los planos As Built reflejan la situación final de la obra ejecutada, incluyendo todas las modificaciones realizadas durante la construcción. Deben ser firmados por el ingeniero residente y el supervisor.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 17. CERTIFICADOS DE CAPACITACIÓN ----------
router.get('/17-capacitacion', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="17_certificados_capacitacion.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CERTIFICADOS DE CAPACITACIÓN');

  y = seccion(doc, 'CAPACITACIONES REALIZADAS', y);
  const caps = [
    ['Operación del sistema de videovigilancia', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
    ['Configuración de cámaras IP', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
    ['Mantenimiento preventivo de equipos', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
    ['Uso del software de gestión (VMS)', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
    ['Seguridad de red y ciberseguridad', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
    ['Primeros auxilios y seguridad industrial', '[Fecha]', '[Duración]', '[Participantes]', '[Certificado]'],
  ];
  const colW = [150, 65, 60, 80, BORDE - 355];
  y = tablaSimple(doc, ['CAPACITACIÓN', 'FECHA', 'DURACIÓN', 'PARTICIPANTES', 'CERTIFICADO'], caps, y, colW);

  y += 20;
  y = seccion(doc, 'OBSERVACIONES', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Todas las capacitaciones deben ser documentadas con lista de asistencia, material de apoyo y certificado de participación. Las capacidades deben ser impartidas por personal calificado.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 18. DOCUMENTACIÓN SSOMA ----------
router.get('/18-ssoma', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="18_documentacion_ssoma.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'DOCUMENTACIÓN SSOMA');

  y = seccion(doc, 'SEGURIDAD Y SALUD EN EL TRABAJO', y);
  doc.fontSize(9).fillColor('#334155').text(
    'La documentación de Seguridad, Salud y Medio Ambiente (SSOMA) del proyecto comprende:',
    M, y, { width: BORDE, lineGap: 3 }
  );
  y += 30;

  const documentos = [
    ['Plan de Seguridad y Salud en el Trabajo', '[Estado]', '[Fecha]'],
    ['Análisis de Riesgos por Actividad', '[Estado]', '[Fecha]'],
    ['Capacitaciones SSOMA impartidas', '[Estado]', '[Fecha]'],
    ['Equipos de Protección Personal (EPP)', '[Estado]', '[Fecha]'],
    ['Inspecciones de seguridad', '[Estado]', '[Fecha]'],
    ['Investigación de incidentes', '[Estado]', '[Fecha]'],
    ['Plan de emergencia y evacuación', '[Estado]', '[Fecha]'],
    ['Registro de capacitaciones SSOMA', '[Estado]', '[Fecha]'],
  ];
  const colW = [220, 80, BORDE - 300];
  y = tablaSimple(doc, ['DOCUMENTO', 'ESTADO', 'FECHA'], documentos, y, colW);

  y += 20;
  y = seccion(doc, 'NORMATIVA APLICABLE', y);
  doc.fontSize(9).fillColor('#334155');
  const normas = [
    '• D.S. N° 005-2018-TR: Reglamento de Seguridad y Salud en el Trabajo',
    '• Ley N° 29783: Ley de Seguridad y Salud en el Trabajo',
    '• D.S. N° 011-2006-TR: Reglamento sobre condiciones y medio ambiente de trabajo',
    '• Normas SSAO de la empresa contratista',
  ];
  normas.forEach((n) => { doc.text(n, M + 10, y, { width: BORDE - 20 }); y += 16; });

  footer(doc);
  doc.end();
});

// ---------- 19. DIAGRAMAS DE RED Y CREDENCIALES ----------
router.get('/19-red-credenciales', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="19_diagramas_red.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'DIAGRAMAS DE RED Y CREDENCIALES');

  y = seccion(doc, 'TOPOLOGÍA DE RED', y);
  doc.fontSize(9).fillColor('#334155').text(
    'El sistema de red del proyecto de Seguridad Ciudadana comprende:',
    M, y, { width: BORDE, lineGap: 3 }
  );
  y += 30;

  const componentes = [
    ['Núcleo (Core)', '[Descripción del equipo core]', '[IP / Subred]'],
    ['Distribución', '[Switches de distribución]', '[IP / Subred]'],
    ['Acceso', '[Switches de acceso]', '[IP / Subred]'],
    ['Cámaras IP', '[Rango de IPs]', '[VLAN]'],
    ['Megáfonos IP', '[Rango de IPs]', '[VLAN]'],
    ['Servidores', '[IPs estáticas]', '[VLAN]'],
    ['Estaciones de trabajo', '[Rango DHCP]', '[VLAN]'],
  ];
  const colW = [120, 220, BORDE - 340];
  y = tablaSimple(doc, ['COMPONENTE', 'DESCRIPCIÓN', 'DIRECCIONAMIENTO'], componentes, y, colW);

  y += 20;
  y = seccion(doc, 'CREDENCIALES DE ACCESO', y);
  const credenciales = [
    ['Administrador del sistema', '[Usuario]', '[Método de autenticación]'],
    ['Operador de videovigilancia', '[Usuario]', '[Método de autenticación]'],
    ['Técnico de mantenimiento', '[Usuario]', '[Método de autenticación]'],
    ['Lectura/Consulta', '[Usuario]', '[Método de autenticación]'],
  ];
  y = tablaSimple(doc, ['ROL', 'USUARIO', 'AUTENTICACIÓN'], credenciales, y, colW);

  y += 20;
  y = seccion(doc, 'NOTA DE SEGURIDAD', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Las credenciales de acceso deben ser asignadas según el principio de mínimo privilegio. Todas las credenciales deben ser documentadas y entregadas bajo custodia del responsable del proyecto. Se recomienda cambiar las contraseñas cada 90 días.',
    M, y, { width: BORDE, lineGap: 3 }
  );

  footer(doc);
  doc.end();
});

// ---------- 20. CIERRE Y CONFORMIDAD ----------
router.get('/20-cierre', (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="20_cierre_conformidad.pdf"');
  doc.pipe(res);

  let y = headerInstitucional(doc, 'CIERRE Y CONFORMIDAD DEL PROYECTO');

  y = seccion(doc, 'ACTA DE CIERRE', y);
  doc.fontSize(9).fillColor('#334155').text(
    'En la ciudad de _____________, a los ___ días del mes de _________ de 20___, se procede al cierre y conformidad del proyecto "Seguridad Ciudadana", previa verificación de los siguientes aspectos:',
    M, y, { width: BORDE, lineGap: 4 }
  );
  y += 50;

  const items = [
    ['1. Instalación de equipos', '[✓ / ✗]', '[Observaciones]'],
    ['2. Configuración del sistema', '[✓ / ✗]', '[Observaciones]'],
    ['3. Pruebas de funcionamiento', '[✓ / ✗]', '[Observaciones]'],
    ['4. Documentación entregada', '[✓ / ✗]', '[Observaciones]'],
    ['5. Capacitación al personal', '[✓ / ✗]', '[Observaciones]'],
    ['6. Garantías de equipos', '[✓ / ✗]', '[Observaciones]'],
    ['7. Planos As Built', '[✓ / ✗]', '[Observaciones]'],
    ['8. Cumplimiento SSOMA', '[✓ / ✗]', '[Observaciones]'],
  ];
  const colW = [150, 50, BORDE - 200];
  y = tablaSimple(doc, ['ASPECTO VERIFICADO', 'ESTADO', 'OBSERVACIONES'], items, y, colW);

  y += 30;
  y = seccion(doc, 'DECLARACIÓN DE CONFORMIDAD', y);
  doc.fontSize(9).fillColor('#334155').text(
    'Las partes declaran estar conformes con la ejecución del proyecto, habiendo verificado que:\n\n' +
    '1. Los equipos e instalaciones cumplen con las especificaciones técnicas aprobadas.\n' +
    '2. La documentación técnica está completa y actualizada.\n' +
    '3. Las garantías de los equipos están vigentes.\n' +
    '4. El personal ha sido capacitado en la operación y mantenimiento del sistema.\n\n' +
    'En consecuencia, se procede al cierre definitivo del proyecto.',
    M, y, { width: BORDE, lineGap: 3 }
  );
  y += 120;

  doc.fontSize(9).fillColor('#111827');
  doc.text('_________________________                    _________________________', M, y);
  y += 14;
  doc.fontSize(8).fillColor('#64748b');
  doc.text('CONTRATISTA', M + 30, y, { width: 180, align: 'center' });
  doc.text('SUPERVISOR', M + 260, y, { width: 180, align: 'center' });
  y += 14;
  doc.text('Nombre: _________________', M, y);
  doc.text('Nombre: _________________', M + 230, y);
  y += 14;
  doc.text('DNI: ___________________', M, y);
  doc.text('DNI: ___________________', M + 230, y);
  y += 14;
  doc.text('Firma: __________________', M, y);
  doc.text('Firma: __________________', M + 230, y);

  y += 40;
  doc.text('_________________________', M + 115, y);
  y += 14;
  doc.text('DIRECTOR DEL PROYECTO', M + 80, y, { width: 180, align: 'center' });
  y += 14;
  doc.text('Nombre: _________________', M + 50, y);
  y += 14;
  doc.text('Firma: __________________', M + 50, y);

  footer(doc);
  doc.end();
});

// ---------- LISTADO DE DOCUMENTOS ----------
router.get('/listado', (req, res) => {
  res.json([
    { id: '01', nombre: 'Índice General', endpoint: '/api/dossier/01-indice', icono: '📑' },
    { id: '02', nombre: 'Memoria Descriptiva', endpoint: '/api/dossier/02-memoria', icono: '📋' },
    { id: '03', nombre: 'Hoja de Contactos', endpoint: '/api/dossier/03-contactos', icono: '📇' },
    { id: '04', nombre: 'Carta de Garantía de Empresa', endpoint: '/api/dossier/04-garantia-empresa', icono: '📄' },
    { id: '05', nombre: 'Descripción de Partidas/Servicios', endpoint: '/api/dossier/05-partidas', icono: '📝' },
    { id: '06', nombre: 'Panel Fotográfico', endpoint: '/api/dossier/06-panel-fotografico', icono: '📷' },
    { id: '07', nombre: 'Actas de Entrega', endpoint: '/api/dossier/07-actas-entrega', icono: '📋' },
    { id: '08', nombre: 'Guías de Materiales', endpoint: '/api/dossier/08-guias-materiales', icono: '📦' },
    { id: '09', nombre: 'Certificados de Calidad', endpoint: '/api/dossier/09-certificados-calidad', icono: '✅' },
    { id: '10', nombre: 'Carta de Garantía de Equipos', endpoint: '/api/dossier/10-garantia-equipos', icono: '🛡️' },
    { id: '11', nombre: 'Fichas Técnicas', endpoint: '/api/dossier/11-fichas-tecnicas', icono: '📊' },
    { id: '12', nombre: 'Manual O&M', endpoint: '/api/dossier/12-manual-om', icono: '📘' },
    { id: '13', nombre: 'Protocolos de Pruebas', endpoint: '/api/dossier/13-protocolos-pruebas', icono: '🔬' },
    { id: '14', nombre: 'Licencias de Software', endpoint: '/api/dossier/14-licencias', icono: '💿' },
    { id: '15', nombre: 'Certificado de Calibración', endpoint: '/api/dossier/15-calibracion', icono: '🔧' },
    { id: '16', nombre: 'Planos As Built', endpoint: '/api/dossier/16-planos', icono: '📐' },
    { id: '17', nombre: 'Certificados de Capacitación', endpoint: '/api/dossier/17-capacitacion', icono: '🎓' },
    { id: '18', nombre: 'Documentación SSOMA', endpoint: '/api/dossier/18-ssoma', icono: '🦺' },
    { id: '19', nombre: 'Diagramas de Red y Credenciales', endpoint: '/api/dossier/19-red-credenciales', icono: '🌐' },
    { id: '20', nombre: 'Cierre y Conformidad', endpoint: '/api/dossier/20-cierre', icono: '🏁' },
  ]);
});

export default router;
