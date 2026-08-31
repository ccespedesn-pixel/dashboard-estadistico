import XLSX from 'xlsx';
import fs from 'node:fs';
const dir = 'C:/Pogramas y otros 2025/PROGRAMA/seguridad-ciudadana/backend/data';
const files = ['PROGRAMACION PLANTA EXTERNA 07 MAYO 26.xlsx','PROGRAMACION PLANTA INTERNA 07 MAYO 26.xlsx'];
for (const f of files) {
  console.log('\n========== ' + f + ' ==========');
  const wb = XLSX.read(fs.readFileSync(dir + '/' + f), { cellDates: false });
  console.log('Hojas:', wb.SheetNames.join(' | '));
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).slice(0, 20);
    console.log('\n--- Hoja: ' + sn + ' (filas: ' + rows.length + ') ---');
    rows.forEach((r, i) => console.log(i + ': ' + JSON.stringify(r)));
  }
}
