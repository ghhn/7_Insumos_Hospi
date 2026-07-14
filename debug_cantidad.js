const XLSX = require('xlsx');
const path = require('path');

const baseDir = 'e:/00_OFI_PRESUPUESTOS_progra/7_Insumos_rado/datos_hospital';
const acuPath = path.join(baseDir, 'SALDOS A MOD. 06 - ACU 16.05 v.02.xlsx');
const acuWb = XLSX.readFile(acuPath);
const acuSheet = acuWb.Sheets[acuWb.SheetNames[0]];
const acuRange = XLSX.utils.decode_range(acuSheet['!ref'] || 'A1');

console.log('🔍 Analizando CANTIDAD (Columna M) en primeros insumos\n');

let contador = 0;
const muestras = [];

for (let r = 0; r <= acuRange.e.r && contador < 50; r++) {
  const cellA = acuSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  const cellM = acuSheet[XLSX.utils.encode_cell({ r, c: 12 })];

  const valA = cellA ? String(cellA.v || '').trim() : '';
  const valM = cellM ? cellM.v : undefined;

  // Solo mostrar filas con código numérico (insumos)
  if (valA && /^\d+$/.test(valA)) {
    const tipo = typeof valM;
    const valor = valM !== undefined ? valM : 'UNDEFINED';

    muestras.push({
      fila: r + 1,
      codigo: valA,
      m_tipo: tipo,
      m_valor: valor,
      m_parseFloat: parseFloat(valM) || 0
    });
    contador++;
  }
}

console.log('Fila | Código    | Tipo     | Valor (Raw)    | parseFloat');
console.log('─'.repeat(70));
muestras.slice(0, 20).forEach(m => {
  const tipo_str = m.m_tipo.substring(0, 8).padEnd(8);
  const valor_str = String(m.m_valor).substring(0, 14).padEnd(14);
  console.log(`${String(m.fila).padStart(4)} | ${m.codigo.padEnd(10)} | ${tipo_str} | ${valor_str} | ${m.m_parseFloat}`);
});

// Contar problemas
const conProblema = muestras.filter(m => m.m_tipo !== 'number' && m.m_valor !== 0);
console.log(`\n⚠️  De ${muestras.length} insumos:`);
console.log(`   ✅ Tipo number: ${muestras.filter(m => m.m_tipo === 'number').length}`);
console.log(`   ❌ Tipo texto/otro: ${conProblema.length}`);

if (conProblema.length > 0) {
  console.log('\n❌ Problemas detectados:');
  conProblema.slice(0, 5).forEach(m => {
    console.log(`   Fila ${m.fila}: tipo=${m.m_tipo}, valor="${m.m_valor}"`);
  });
}
