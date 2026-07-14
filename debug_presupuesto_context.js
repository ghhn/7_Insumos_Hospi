const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const presPath = path.join(baseDir, 'SALDOS A MOD. 06 - PRESUPUESTO 16.05 v.02.xlsx');
const presWb = XLSX.readFile(presPath);
const presSheet = presWb.Sheets[presWb.SheetNames[0]];

console.log('📋 Contexto de filas del PRESUPUESTO (filas 14-22)\n');

for (let r = 13; r < 22; r++) {
  const cellA = presSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const cellB = presSheet[XLSX.utils.encode_cell({ r, c: 1 })];
  const cellK = presSheet[XLSX.utils.encode_cell({ r, c: 10 })];
  const cellM = presSheet[XLSX.utils.encode_cell({ r, c: 12 })];
  const cellN = presSheet[XLSX.utils.encode_cell({ r, c: 13 })];
  const cellQ = presSheet[XLSX.utils.encode_cell({ r, c: 16 })];

  const valA = cellA ? String(cellA.v || '').trim() : '';
  const valB = cellB ? String(cellB.v || '').trim() : '';
  const valK = cellK ? String(cellK.v || '').trim() : '';
  const valM = cellM ? (cellM.v || '') : '';
  const valN = cellN ? (cellN.v || '') : '';
  const valQ = cellQ ? (cellQ.v || '') : '';

  console.log(`Fila ${String(r + 1).padStart(3)}: A="${valA}" | B="${valB.substring(0, 20)}" | K="${valK}" | M="${valM}" | N="${valN}" | Q="${valQ}"`);
}
