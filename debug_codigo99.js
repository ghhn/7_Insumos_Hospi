const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const acuPath = path.join(baseDir, 'SALDOS A MOD. 06 - ACU 16.05 v.02.xlsx');
const acuWb = XLSX.readFile(acuPath);
const acuSheet = acuWb.Sheets[acuWb.SheetNames[0]];
const acuRange = XLSX.utils.decode_range(acuSheet['!ref'] || 'A1');

console.log('🔍 Analizando Partida OE.4.5.4.04 (donde aparece código 99 múltiple veces)\n');

let foundPartida = false;
let rowsInPartida = [];

for (let r = 0; r <= acuRange.e.r; r++) {
  const cellA = acuSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const valA = cellA ? String(cellA.v || '').trim() : '';

  if (valA === 'Partida: OE.4.5.4.04') {
    foundPartida = true;
    console.log(`✅ Encontrada en fila ${r + 1}\n`);
  }

  if (foundPartida) {
    // Si encontramos siguiente partida, salir
    if (valA.startsWith('Partida:') && !valA.includes('OE.4.5.4.04')) {
      break;
    }

    const cellB = acuSheet[XLSX.utils.encode_cell({ r, c: 1 })];
    const cellM = acuSheet[XLSX.utils.encode_cell({ r, c: 12 })];

    const valB = cellB ? String(cellB.v || '').trim() : '';
    const valM = cellM ? cellM.v : '';

    if (valA === '99') {
      rowsInPartida.push({
        fila: r + 1,
        codigo: valA,
        descripcion: valB,
        cantidad: valM
      });
    }
  }
}

console.log('Filas con código 99 en OE.4.5.4.04:\n');
console.log('Fila | Código | Descripción              | Cantidad');
console.log('─'.repeat(70));
rowsInPartida.forEach(row => {
  console.log(`${String(row.fila).padStart(4)} | ${row.codigo.padEnd(6)} | ${row.descripcion.substring(0, 23).padEnd(23)} | ${row.cantidad}`);
});

if (rowsInPartida.length === 0) {
  console.log('❌ No encontrado');
} else {
  console.log(`\n⚠️  El código 99 aparece ${rowsInPartida.length} veces con diferentes cantidades`);
  console.log('Esto explica por qué algunos valores "varían"');
}
