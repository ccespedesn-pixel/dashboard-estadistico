import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/Pogramas y otros 2025/PROGRAMA/seguridad-ciudadana/backend/data';
const files = ['Libro1 5ag26.xlsx', 'Libro2 5ag26.xlsx', 'Libro3 5ag26.xlsx'];

function norm(h){return String(h).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]/g,'');}
const ALIASES={fecha:['fecha','date','dia','fecharegistro'],ubicacion:['ubicacion','planta','locacion','lugar','sede'],actividad:['actividad','sistema','sist','codigo','codigoactividad','actividades'],subactividad:['subactividad','subactividades','tfase','etapa','componente'],cantidad:['cantidad','cant','unidades','n','qty','cantidadrealizada','metros'],avance:['avance','porcentaje','pct','porcentajeavance','avancereal','porcentodeavance'],estado:['estado','status','situacion'],observaciones:['observaciones','observacion','nota','notas','comentario','comentarios'],causa:['causa','motivo','causaesde','razon','ponchodecausa']};
function canon(n){for(const[k,l]of Object.entries(ALIASES))if(l.includes(n))return k;return null;}
function score(hs){const s=new Set(hs.map(h=>canon(norm(h))).filter(Boolean));return s.size;}

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { console.log('FALTA', f); continue; }
  const buf = fs.readFileSync(p);
  console.log('\n\n==================== ' + f + '  (' + buf.length + ' bytes) ====================');
  let wb = null, detalle = null;
  try { wb = XLSX.read(buf, { type: 'buffer', cellDates: true }); detalle = 'buffer'; }
  catch { try { wb = XLSX.read(buf.toString('utf8').replace(/^\uFEFF/,''), { type: 'string', cellDates: true }); detalle = 'texto'; } catch (e) { console.log('NO SE PUDO ABRIR:', e.message); continue; } }
  console.log('Formato detectado:', detalle, '| Pestañas:', wb.SheetNames.join(', '));
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    let aoa;
    try { aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', cellDates: true }); } catch (e) { console.log('  pestaña ' + name + ': error ' + e.message); continue; }
    console.log('\n  --- Pestaña "' + name + '" (' + aoa.length + ' filas) ---');
    // mejores puntajes de fila
    const scores = aoa.slice(0, 20).map((r, i) => ({ i: i + 1, sc: score(r.map(String)), row: r }));
    const best = scores.sort((a, b) => b.sc - a.sc)[0];
    console.log('  Mejor fila encabezado (puntaje ' + best.sc + '): fila ' + best.i);
    // imprimir primeras 10 filas crudas
    aoa.slice(0, 10).forEach((r, i) => {
      const cells = r.slice(0, 12).map((c) => (c === undefined || c === '' ? '' : String(c))).join(' | ');
      console.log('  [' + (i + 1) + '] ' + cells);
    });
  }
}
