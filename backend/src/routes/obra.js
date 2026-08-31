import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { db } from '../lib/db.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const limpiar = (v) => String(v ?? '').trim();
const num = (v) => {
  const s = limpiar(v);
  if (s === '') return null;
  const n = Number(s.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
};

function detectarColumnas(aoa) {
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const hs = aoa[i].map((c) => limpiar(c).toUpperCase());
    const idxItem = hs.findIndex((h) => h.startsWith('ÍTEM') || h === 'ITEM' || h.includes('ITEM'));
    const idxDesc = hs.findIndex((h) => h.includes('DESCRIPCIÓN') || h.includes('DESCRIPCION'));
    if (idxItem >= 0 && idxDesc >= 0) {
      const diasChoices = hs.map((h, j) => (h.includes('SERVICIO') ? j : -1)).filter((j) => j >= 0);
      return {
        fila: i,
        item: idxItem,
        desc: idxDesc,
        unidad: hs.findIndex((h) => h === 'UNIDAD' || h.includes('UNIDAD')),
        cant: hs.findIndex((h) => h.includes('CANT')),
        status: hs.findIndex((h) => h === 'STATUS' || h === 'STADTUS' || h.startsWith('STATUS')),
        area: hs.findIndex((h) => h === 'AREA' || h.includes('AREA')),
        prof: hs.findIndex((h) => h.includes('PROFESIONAL') || h.includes('CONTRATISTA')),
        dias: diasChoices.length ? diasChoices[0] : -1,
        diasConfig: diasChoices.length > 1 ? diasChoices[1] : -1,
      };
    }
  }
  return null;
}

// extrae los ítems "hoja" de una hoja; los encabezados jerárquicos sin cantidad definen el grupo
function parsearHoja(aoa, conGrupos) {
  const hdr = detectarColumnas(aoa);
  if (!hdr) return [];
  const items = [];
  let grupoActual = '';
  for (let i = hdr.fila + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r) continue;
    const codigo = limpiar(r[hdr.item]);
    const descripcion = limpiar(r[hdr.desc]);
    if (!codigo && !descripcion) continue;
    if (hdr.cant < 0 || hdr.cant >= r.length || num(r[hdr.cant]) === null) {
      if (descripcion && conGrupos) grupoActual = descripcion.trim();
      continue;
    }
    const cantidad_total = num(r[hdr.cant]);
    const unidad = hdr.unidad >= 0 && r[hdr.unidad] ? limpiar(r[hdr.unidad]) : 'und';
    const status = hdr.status >= 0 && r[hdr.status] ? limpiar(r[hdr.status]).toLowerCase() : '';
    const area = hdr.area >= 0 && r[hdr.area] ? limpiar(r[hdr.area]).toUpperCase() : '';
    const contratista = hdr.prof >= 0 && r[hdr.prof] ? limpiar(r[hdr.prof]) : '';
    const dias = hdr.dias >= 0 && r[hdr.dias] ? limpiar(r[hdr.dias]) : '';
    const dias_config = hdr.diasConfig >= 0 && r[hdr.diasConfig] ? limpiar(r[hdr.diasConfig]) : '';
    const realizado = status === 'realizado' || status === 'realisado';
    items.push({
      codigo,
      descripcion,
      unidad,
      cantidad_total,
      cantidad_real: realizado ? cantidad_total : 0,
      status_origen: realizado ? 'realizado' : (status || 'falta'),
      contratista,
      dias,
      dias_config,
      grupo: grupoActual,
      area,
    });
  }
  return items;
}

function importar() {
  const archivos = fs.readdirSync(DATA_DIR).filter((f) => /programacion planta/i.test(f) && /\.xlsx?$/i.test(f));
  const upsert = db.prepare(`INSERT INTO obra_items
    (area, grupo, codigo, descripcion, unidad, cantidad_total, cantidad_real, status_origen, contratista, dias, dias_config, manual)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(area, codigo) DO UPDATE SET
      descripcion=excluded.descripcion, unidad=excluded.unidad,
      grupo=excluded.grupo,
      cantidad_total=excluded.cantidad_total, status_origen=excluded.status_origen,
      contratista=excluded.contratista, dias=excluded.dias, dias_config=excluded.dias_config,
      cantidad_real = CASE WHEN obra_items.manual = 1 THEN obra_items.cantidad_real ELSE excluded.cantidad_real END`);
  const porArchivo = [];
  let total = 0;
  const llavesNuevas = new Set();
  for (const f of archivos) {
    let wb;
    try { wb = XLSX.read(fs.readFileSync(path.join(DATA_DIR, f)), { type: 'buffer' }); } catch { continue; }
    let cuenta = 0;
    for (const sn of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      // jerárquico si una proporción relevante de filas descriptivas no trae cantidad (encabezados de grupo)
      const hdrE = detectarColumnas(aoa);
      let jerarquico = false;
      if (hdrE && hdrE.cant >= 0) {
        let totalD = 0, vacios = 0;
        for (let i = hdrE.fila + 1; i < aoa.length; i++) {
          const r = aoa[i];
          if (!r) continue;
          const desc = limpiar(r[hdrE.desc]);
          if (!desc) continue;
          totalD++;
          if (hdrE.cant >= r.length || num(r[hdrE.cant]) === null) vacios++;
        }
        jerarquico = totalD > 0 && vacios / totalD > 0.15;
      }
      for (const it of parsearHoja(aoa, jerarquico)) {
        const area = ['PLANTA INTERNA', 'PLANTA EXTERNA'].includes(it.area) ? it.area : 'PLANTA EXTERNA';
        const grupo = it.grupo || area;
        upsert.run(area, grupo, it.codigo, it.descripcion, it.unidad, it.cantidad_total, it.cantidad_real, it.status_origen, it.contratista, it.dias, it.dias_config, 0);
        llavesNuevas.add(area + '|' + it.codigo);
        total++;
        cuenta++;
      }
    }
    porArchivo.push({ archivo: f, items: cuenta });
  }
  // eliminar filas obsoletas (que ya no aparecen en los cuadros), conservando ediciones manuales existentes
  if (llavesNuevas.size) {
    const arr = [...llavesNuevas];
    const ph = arr.map(() => '?').join(',');
    db.prepare(`DELETE FROM obra_items WHERE (area || '|' || codigo) NOT IN (${ph})`).run(...arr);
  }
  return { archivos: porArchivo, items: total };
}

// detalle agregado listo para la vista (agrupado por área y grupo)
router.post('/importar', (req, res) => {
  try {
    const r = importar();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'Error al importar: ' + e.message });
  }
});

// analiza "DIA 1 AL 20" / "DIA 5-15(MONTAJE)" -> días de ejecución
function analizarDias(dias) {
  const s = limpiar(dias);
  if (!s) return null;
  const nums = (s.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  const inicio = Math.min(...nums);
  const fin = Math.max(...nums);
  return { inicio, fin, span: Math.max(1, fin - inicio + 1) };
}

// detalle agregado listo para la vista (agrupado por área y grupo)
function construirReporte(area, pInst, pConf) {
  const where = area && area !== 'TODAS' ? 'WHERE area = ?' : '';
  const rows = db.prepare(`
    SELECT id, area, grupo, codigo, descripcion, unidad, cantidad_total, cantidad_real, dias, dias_config, configurado, contratista, rest_inst, rest_conf, config_estado
    FROM obra_items ${where}
    ORDER BY area, grupo, codigo`).all(...(where ? [area] : []));

  const detalle = [];
  const porArea = {};
  let gItems = 0, gInstRest = 0, gConfRest = 0, gInstAj = 0, gConfAj = 0;

  for (const r of rows) {
    const f = calcularFases(r);
    const instRest = f.rest_inst;
    const confRest = f.rest_conf;
    if (f.pct >= 99 || (instRest + confRest) <= 0) continue;
    const instAj = Math.round((instRest / pInst) * 10) / 10;
    const confAj = Math.round((confRest / pConf) * 10) / 10;
    detalle.push({
      id: r.id, area: r.area, grupo: r.grupo, codigo: r.codigo, descripcion: r.descripcion, unidad: r.unidad,
      cantidad_total: r.cantidad_total, cantidad_real: r.cantidad_real,
      pct_inst: f.pct_inst, pct_conf: f.pct_conf, pct: f.pct,
      dias_inst: f.dias_inst, dias_conf: f.dias_conf,
      inst_restantes: instRest, conf_restantes: confRest, total_restantes: Math.round((instRest + confRest) * 10) / 10,
      inst_restantes_aj: instAj, conf_restantes_aj: confAj, total_restantes_aj: Math.round((instAj + confAj) * 10) / 10,
      rest_inst_manual: f.rest_inst_manual, rest_conf_manual: f.rest_conf_manual,
      config_estado: f.config_estado,
      contratista: r.contratista,
    });
    if (!porArea[r.area]) porArea[r.area] = { items: 0, inst_restantes: 0, conf_restantes: 0, total_restantes: 0, inst_aj: 0, conf_aj: 0, total_aj: 0, grupos: {} };
    const A = porArea[r.area];
    A.items++;
    A.inst_restantes += instRest;
    A.conf_restantes += confRest;
    A.total_restantes += instRest + confRest;
    A.inst_aj += instAj;
    A.conf_aj += confAj;
    A.total_aj += instAj + confAj;
    if (!A.grupos[r.grupo]) A.grupos[r.grupo] = { items: 0, inst_restantes: 0, conf_restantes: 0, total_restantes: 0 };
    const G = A.grupos[r.grupo];
    G.items++;
    G.inst_restantes += instRest;
    G.conf_restantes += confRest;
    G.total_restantes += instRest + confRest;
    gItems++;
    gInstRest += instRest;
    gConfRest += confRest;
    gInstAj += instAj;
    gConfAj += confAj;
  }

  return {
    personas: { inst: pInst, conf: pConf },
    porArea: Object.entries(porArea).map(([nombre, a]) => ({
      area: nombre,
      items: a.items,
      inst_restantes: Math.round(a.inst_restantes * 10) / 10,
      conf_restantes: Math.round(a.conf_restantes * 10) / 10,
      total_restantes: Math.round(a.total_restantes * 10) / 10,
      inst_restantes_aj: Math.round(a.inst_aj * 10) / 10,
      conf_restantes_aj: Math.round(a.conf_aj * 10) / 10,
      total_restantes_aj: Math.round(a.total_aj * 10) / 10,
      grupos: Object.entries(a.grupos).map(([g, x]) => ({ grupo: g, ...x })),
    })),
    total: {
      items: gItems,
      inst_restantes: Math.round(gInstRest * 10) / 10,
      conf_restantes: Math.round(gConfRest * 10) / 10,
      total_restantes: Math.round((gInstRest + gConfRest) * 10) / 10,
      inst_restantes_aj: Math.round(gInstAj * 10) / 10,
      conf_restantes_aj: Math.round(gConfAj * 10) / 10,
      total_restantes_aj: Math.round((gInstAj + gConfAj) * 10) / 10,
    },
    detalle,
  };
}

// reporte de tiempo restante (JSON), con reducción por cantidad de personas
router.get('/tiempos', (req, res) => {
  const pInst = Math.max(1, parseInt(req.query.personas_inst, 10) || 1);
  const pConf = Math.max(1, parseInt(req.query.personas_conf, 10) || 1);
  res.json(construirReporte(req.query.area, pInst, pConf));
});

// versión PDF del mismo reporte
router.get('/tiempos.pdf', (req, res) => {
  const pInst = Math.max(1, parseInt(req.query.personas_inst, 10) || 1);
  const pConf = Math.max(1, parseInt(req.query.personas_conf, 10) || 1);
  const r = construirReporte(req.query.area, pInst, pConf);
  const colMap = { 'PLANTA EXTERNA': 'Planta Externa', 'PLANTA INTERNA': 'Planta Interna' };
  const label = (a) => colMap[a] || a;

  const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="tiempo_para_finalizar.pdf"');
  doc.pipe(res);

  doc.fontSize(16).text('REPORTE: TIEMPO PARA FINALIZAR TRABAJOS PENDIENTES', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#555').text(`Generado el ${new Date().toLocaleDateString('es-ES')} · Días estimados por persona`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(11).fillColor('#000').text(`Personas asignadas: Instalación = ${pInst} · Configuración = ${pConf}`);
  doc.moveDown(0.5);

  doc.fontSize(12).text('RESUMEN GENERAL');
  doc.moveDown(0.2);
  doc.fontSize(9);
  doc.text(`• Trabajos pendientes: ${r.total.items} ítems`);
  doc.text(`• Días instalación restantes (1 persona): ${r.total.inst_restantes}  →  con ${pInst} persona(s): ${r.total.inst_restantes_aj}`);
  doc.text(`• Días configuración restantes (1 persona): ${r.total.conf_restantes}  →  con ${pConf} persona(s): ${r.total.conf_restantes_aj}`);
  doc.text(`• Total días restantes reales: ${r.total.total_restantes}  →  con personal: ${r.total.total_restantes_aj}`);
  doc.moveDown();

  doc.fontSize(11).text('RESUMEN POR ÁREA');
  doc.moveDown(0.2);
  doc.fontSize(8).fillColor('#555').text('Área             Ítems   Inst. rest.(base)  Inst.(×pers.)  Conf.(base)  Conf.(×pers.)  Total(base)  Total(×pers.)');
  doc.moveDown(0.1);
  doc.fillColor('#000');
  r.porArea.forEach((a) => {
    doc.fontSize(8).text(
      `${label(a.area).padEnd(17).slice(0, 17)}${String(a.items).padEnd(8)}` +
      `${String(a.inst_restantes).padEnd(10)}${String(a.inst_restantes_aj).padEnd(15)}` +
      `${String(a.conf_restantes).padEnd(15)}${String(a.conf_restantes_aj).padEnd(14)}` +
      `${String(a.total_restantes).padEnd(14)}${String(a.total_restantes_aj)}`);
  });
  doc.moveDown();

  doc.fontSize(11).text('DETALLE POR ÍTEM');
  doc.moveDown(0.2);
  doc.fontSize(7).fillColor('#555').text('Área        Código         Descripción                 Inst.rest  Inst.aj  Conf.rest  Conf.aj  Total rest  Total aj');
  doc.moveDown(0.1);
  doc.fillColor('#000');
  r.detalle.forEach((x) => {
    const d = `${label(x.area).slice(0, 11).padEnd(12)}${x.codigo.padEnd(15).slice(0, 15)}${x.descripcion.padEnd(32).slice(0, 32)}`;
    doc.fontSize(7).text(`${d}${String(x.inst_restantes).padEnd(10)}${String(x.inst_restantes_aj).padEnd(8)}${String(x.conf_restantes).padEnd(10)}${String(x.conf_restantes_aj).padEnd(9)}${String(x.total_restantes).padEnd(11)}${String(x.total_restantes_aj).padEnd(8)}`);
  });

  doc.end();
});

// fase instalación=primera columna, configuración=segunda columna; avance ponderado por días de cada fase
function estadoConf(o) {
  if (o.config_estado) return o.config_estado;
  if (!o.dias_config || !limpiar(o.dias_config)) return 'no_aplica';
  return o.configurado ? 'completado' : 'pendiente';
}

function calcularFases(o) {
  const di = analizarDias(o.dias);
  const dc = analizarDias(o.dias_config);
  const dias_inst = di ? di.span : 0;
  const dias_conf = dc ? dc.span : 0;
  const pct_inst = o.cantidad_total > 0 ? Math.min(100, (o.cantidad_real / o.cantidad_total) * 100) : 0;
  const est = estadoConf(o);
  const noAplica = est === 'no_aplica';
  const configCompleta = est === 'completado';
  const aplicaManual = o.config_estado && (est === 'aplica' || est === 'pendiente' || est === 'completado');
  const pct_conf = configCompleta && !noAplica ? 100 : 0;
  const wInst = dias_inst;
  let wConf = 0;
  if (!noAplica) {
    if (dias_conf > 0) wConf = dias_conf;
    else if (aplicaManual) wConf = 1;
  }
  const wSum = wInst + wConf;
  const pct = wSum > 0 ? (pct_inst * wInst + pct_conf * wConf) / wSum : pct_inst;
  const estado = pct >= 99 ? 'Completado' : pct > 0 ? 'En progreso' : 'Pendiente';
  const calcInst = Math.round(dias_inst * (1 - pct_inst / 100) * 10) / 10;
  const calcConf = noAplica || configCompleta ? 0 : (dias_conf > 0 ? Math.round(dias_conf * 10) / 10 : 1);
  const rest_inst = o.rest_inst != null ? o.rest_inst : calcInst;
  const rest_conf = o.rest_conf != null ? o.rest_conf : calcConf;
  return {
    dias_inst,
    dias_conf,
    pct_inst: Math.round(pct_inst * 10) / 10,
    pct_conf,
    pct: Math.round(pct * 10) / 10,
    estado,
    config_estado: est,
    rest_inst: Math.round(rest_inst * 10) / 10,
    rest_conf: Math.round(rest_conf * 10) / 10,
    rest_inst_manual: o.rest_inst != null,
    rest_conf_manual: o.rest_conf != null,
  };
}

// detalle agregado listo para la vista (agrupado por área y grupo)
router.get('/detalle', (req, res) => {
  const { area } = req.query;
  const where = area && area !== 'TODAS' ? 'WHERE o.area = ?' : '';
  const rows = db.prepare(
    `SELECT o.* FROM obra_items o ${where}
     ORDER BY o.area, o.grupo, o.codigo`).all(...(where ? [area] : []));
  const grupos = {};
  for (const r of rows) {
    const f = calcularFases(r);
    if (!grupos[r.area]) grupos[r.area] = {};
    if (!grupos[r.area][r.grupo]) grupos[r.area][r.grupo] = { items: [], completado: 0, en_progreso: 0, pendiente: 0, realizado_total: 0, total_total: 0 };
    const g = grupos[r.area][r.grupo];
    g.items.push({ ...r, ...f });
    g.total_total += r.cantidad_total;
    g.realizado_total += r.cantidad_real;
    if (f.estado === 'Completado') g.completado++;
    else if (f.estado === 'En progreso') g.en_progreso++;
    else g.pendiente++;
  }
  res.json({ datos: grupos });
});

// faltantes de obra (JSON) - items con faltante de instalación y/o configuración
router.get('/faltantes', (req, res) => {
  const area = req.query.area;
  const where = area && area !== 'TODAS' ? 'WHERE o.area = ?' : '';
  const rows = db.prepare(
    `SELECT o.* FROM obra_items o ${where}
     ORDER BY o.area, o.grupo, o.codigo`).all(...(where ? [area] : []));

  const porArea = {};
  let totalItems = 0, totalFaltaInst = 0, totalFaltaConf = 0;

  for (const r of rows) {
    const f = calcularFases(r);
    const faltaInst = Math.round(Math.max(0, r.cantidad_total - r.cantidad_real) * 10) / 10;
    const confEst = f.config_estado;
    const faltaConf = (confEst === 'pendiente' || confEst === 'aplica') ? Math.round(Math.max(0, r.cantidad_total - r.cantidad_real) * 10) / 10 : 0;

    if (faltaInst <= 0 && faltaConf <= 0) continue;

    if (!porArea[r.area]) porArea[r.area] = { grupos: {}, items: 0, faltaInst: 0, faltaConf: 0 };
    const A = porArea[r.area];
    if (!A.grupos[r.grupo]) A.grupos[r.grupo] = [];
    A.grupos[r.grupo].push({
      id: r.id, codigo: r.codigo, descripcion: r.descripcion, unidad: r.unidad,
      cantidad_total: r.cantidad_total, cantidad_real: r.cantidad_real,
      faltaInst, faltaConf,
      pct_inst: f.pct_inst, pct: f.pct,
      config_estado: confEst, estado: f.estado,
    });
    A.items++;
    A.faltaInst = Math.round((A.faltaInst + faltaInst) * 10) / 10;
    A.faltaConf = Math.round((A.faltaConf + faltaConf) * 10) / 10;
    totalItems++;
    totalFaltaInst = Math.round((totalFaltaInst + faltaInst) * 10) / 10;
    totalFaltaConf = Math.round((totalFaltaConf + faltaConf) * 10) / 10;
  }

  const resultado = {
    porArea: Object.entries(porArea).map(([area, A]) => ({
      area,
      items: A.items,
      faltaInst: A.faltaInst,
      faltaConf: A.faltaConf,
      grupos: Object.entries(A.grupos).map(([grupo, items]) => ({ grupo, items })),
    })),
    total: { items: totalItems, faltaInst: totalFaltaInst, faltaConf: totalFaltaConf },
  };
  res.json(resultado);
});

// actualiza cantidad realizada y/o total a ejecutar y/o configuración (recalcula avance y marca manual)
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const exist = db.prepare('SELECT id, cantidad_total FROM obra_items WHERE id=?').get(id);
  if (!exist) return res.status(404).json({ error: 'No encontrado' });
  const cantidad = num(req.body.cantidad_real);
  if (req.body.cantidad_real !== undefined && (cantidad === null || cantidad < 0)) return res.status(400).json({ error: 'cantidad_real debe ser un número >= 0' });
  const conf = req.body.configurado;
  const tieneConf = conf === 0 || conf === 1;
  const restIns = num(req.body.rest_inst);
  const restCnf = num(req.body.rest_conf);
  const sets = [];
  const vals = [];
  const poner = (campo, v) => { sets.push(`${campo}=?`); vals.push(v); };
  if (req.body.cantidad_total !== undefined && req.body.cantidad_total !== null) {
    const totalN = num(req.body.cantidad_total);
    if (totalN === null || totalN <= 0) return res.status(400).json({ error: 'cantidad_total debe ser un número > 0' });
    poner('cantidad_total', totalN);
    poner('cantidad_real', cantidad);
  } else if (req.body.cantidad_real !== undefined) {
    poner('cantidad_real', cantidad);
  }
  if (tieneConf) poner('configurado', conf ? 1 : 0);
  if (req.body.config_estado !== undefined) {
    const est = req.body.config_estado;
    if (!['no_aplica', 'aplica', 'pendiente', 'completado'].includes(est)) return res.status(400).json({ error: 'config_estado inválido' });
    poner('config_estado', est);
    poner('configurado', est === 'completado' ? 1 : 0);
  }
  if (req.body.rest_inst !== undefined) {
    if (req.body.rest_inst === '' || req.body.rest_inst === null) poner('rest_inst', null);
    else if (restIns === null || restIns < 0) return res.status(400).json({ error: 'rest_inst debe ser un número >= 0' });
    else poner('rest_inst', restIns);
  }
  if (req.body.rest_conf !== undefined) {
    if (req.body.rest_conf === '' || req.body.rest_conf === null) poner('rest_conf', null);
    else if (restCnf === null || restCnf < 0) return res.status(400).json({ error: 'rest_conf debe ser un número >= 0' });
    else poner('rest_conf', restCnf);
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  poner('manual', 1);
  db.prepare(`UPDATE obra_items SET ${sets.join(', ')} WHERE id=?`).run(...vals, id);
  res.json({ ok: true });
});

export default router;