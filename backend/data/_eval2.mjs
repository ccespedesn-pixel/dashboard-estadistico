import XLSX from 'xlsx';
import fs from 'node:fs';
const dir = 'C:/Pogramas y otros 2025/PROGRAMA/seguridad-ciudadana/backend/data';
const files = ['PROGRAMACION PLANTA EXTERNA 07 MAYO 26.xlsx','PROGRAMACION PLANTA INTERNA 07 MAYO 26.xlsx'];
for (const f of files) {
  console.log('\n========== ' + f + ' ==========');
  const wb = XLSX.read(fs.readFileSync(dir + '/' + f), { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('Total filas: ' + rows.length);
  // conteo de status
  const colStatus = f.includes('EXTERNA') ? 4 : 2; // exter-file: CANT es col 3, STATUS col 4; inter-file: stadtus col 2, CANT col 5
  const status = {};
  for (let i = 1; i < rows.length; i++) {
    const v = String(rows[i][colStatus] ?? '').trim();
    status[v] = (status[v] || 0) + 1;
  }
  console.log('STATUS:', JSON.stringify(status));
  console.log('--- todas las filas ---');
  rows.forEach((r, i) => console.log(i + ': ' + JSON.stringify(r)));
}
