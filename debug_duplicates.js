const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const acuPath = path.join(baseDir, 'SALDOS A MOD. 06 - ACU 16.05 v.02.xlsx');
const acuWb = XLSX.readFile(acuPath);
const acuSheet = acuWb.Sheets[acuWb.SheetNames[0]];
const acuRange = XLSX.utils.decode_range(acuSheet['!ref'] || 'A1');

console.log('🔍 Buscando inconsistencias en cantidad_insumo\n');

const insumosPorPartida = {}; // partida → { codigo → [cantidades] }

let currentPartida = null;
const clasificadores = ['MANO DE OBRA', 'MATERIALES', 'EQUIPO', 'SUB-CONTRATOS'];

for (let r = 0; r <= acuRange.e.r; r++) {
  const cellA = acuSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const cellM = acuSheet[XLSX.utils.encode_cell({ r, c: 12 })];

  const valA = cellA ? String(cellA.v || '').trim() : '';
  const valM = cellM ? (cellM.v || '') : '';

  // Detectar partida
  if (valA.startsWith('Partida:')) {
    const match = valA.match(/Partida:\s*(.+)/);
    if (match) {
      currentPartida = match[1].trim();
      if (!insumosPorPartida[currentPartida]) {
        insumosPorPartida[currentPartida] = {};
      }
    }
    continue;
  }

  // Registrar insumo
  if (currentPartida && valA && /^\d+$/.test(valA)) {
    const codigo = valA;
    const cantidad = parseFloat(valM) || 0;

    if (!insumosPorPartida[currentPartida][codigo]) {
      insumosPorPartida[currentPartida][codigo] = [];
    }
    insumosPorPartida[currentPartida][codigo].push(cantidad);
  }
}

// Buscar duplicados en la misma partida
console.log('Buscando insumos que aparecen 2+ veces en la misma partida:\n');

let problemasEncontrados = 0;

Object.entries(insumosPorPartida).forEach(([partida, insumos]) => {
  Object.entries(insumos).forEach(([codigo, cantidades]) => {
    if (cantidades.length > 1) {
      // Verificar si son iguales
      const sonIguales = cantidades.every(c => c === cantidades[0]);
      if (!sonIguales) {
        problemasEncontrados++;
        if (problemasEncontrados <= 10) {
          console.log(`❌ Partida ${partida}, Código ${codigo}:`);
          console.log(`   Aparece ${cantidades.length} veces con valores: ${cantidades.map(c => c).join(', ')}`);
        }
      }
    }
  });
});

console.log(`\n📊 Total partidas: ${Object.keys(insumosPorPartida).length}`);
console.log(`⚠️  Problemas encontrados: ${problemasEncontrados}`);

if (problemasEncontrados === 0) {
  console.log('\n✅ NO hay inconsistencias en cantidad_insumo dentro de partidas');
  console.log('(Si un insumo aparece 2+ veces en la misma partida, tiene la misma cantidad)');
}
