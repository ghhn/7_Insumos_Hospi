const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const presPath = path.join(baseDir, 'SALDOS A MOD. 06 - PRESUPUESTO 16.05 v.02.xlsx');
const presWb = XLSX.readFile(presPath);
const presSheet = presWb.Sheets[presWb.SheetNames[0]];

console.log('📋 Analizando filas del PRESUPUESTO para OE.1.1.1.01\n');

let encontrado = false;

for (let r = 0; r < 100; r++) {
  const cellA = presSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const valA = cellA ? String(cellA.v || '').trim() : '';

  if (valA === 'OE.1.1.1.01') {
    encontrado = true;
    console.log(`✅ Encontrado en fila ${r + 1}\n`);

    // Mostrar todas las columnas
    for (let c = 0; c < 20; c++) {
      const cell = presSheet[XLSX.utils.encode_cell({ r, c })];
      const val = cell ? String(cell.v || '') : '';
      const col = String.fromCharCode(65 + c);
      console.log(`Columna ${col} (${c}): "${val}"`);
    }

    break;
  }
}

if (!encontrado) {
  console.log('❌ OE.1.1.1.01 no encontrado en primeras 100 filas');
}
