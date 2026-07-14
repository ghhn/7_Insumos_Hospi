const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const acuPath = path.join(baseDir, 'SALDOS A MOD. 06 - ACU 16.05 v.02.xlsx');
const acuWb = XLSX.readFile(acuPath);
const acuSheet = acuWb.Sheets[acuWb.SheetNames[0]];

console.log('Fila 12 - Primera partida (todas las columnas):\n');

for (let c = 0; c < 20; c++) {
  const cell = acuSheet[XLSX.utils.encode_cell({ r: 11, c })]; // Fila 12 (index 11)
  const val = cell ? String(cell.v || '') : '';
  const col = String.fromCharCode(65 + c); // A, B, C...
  console.log(`Columna ${col} (${c}): "${val}"`);
}
