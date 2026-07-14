const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const acuPath = path.join(baseDir, 'SALDOS A MOD. 06 - ACU 16.05 v.02.xlsx');
const acuWb = XLSX.readFile(acuPath);
const acuSheet = acuWb.Sheets[acuWb.SheetNames[0]];
const acuRange = XLSX.utils.decode_range(acuSheet['!ref'] || 'A1');

console.log('Buscando patrones de PARTIDA...\n');

let partidasEncontradas = 0;

for (let r = 0; r <= acuRange.e.r && partidasEncontradas < 20; r++) {
  const cellA = acuSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const cellN = acuSheet[XLSX.utils.encode_cell({ r, c: 13 })];

  const valA = cellA ? String(cellA.v || '').trim() : '';
  const valN = cellN ? String(cellN.v || '').trim() : '';

  if (valA.startsWith('Partida:') || valN.startsWith('Rendimiento:')) {
    console.log(`Fila ${r + 1}:`);
    console.log(`  A: "${valA}"`);
    console.log(`  N: "${valN}"`);
    console.log(`  Siguiente fila A: "${acuSheet[XLSX.utils.encode_cell({ r: r + 1, c: 0 })] ? String(acuSheet[XLSX.utils.encode_cell({ r: r + 1, c: 0 })].v || '').trim() : ''}"`);
    console.log('');
    if (valA.startsWith('Partida:')) {
      partidasEncontradas++;
    }
  }
}

console.log(`\nTotal de partidas encontradas: ${partidasEncontradas}`);
