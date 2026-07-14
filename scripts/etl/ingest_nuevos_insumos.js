const fs = require('fs');
const xlsx = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: 'frontend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
});

async function run() {
  console.log("==================================================");
  console.log("ETL: CARGANDO Insumos para analisis-Hospital (1).xlsx");
  console.log("==================================================");

  try {
    const excelPath = 'Insumos para analisis-Hospital (1).xlsx';
    console.log("[1/3] Leyendo", excelPath);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Usamos header: 1 para obtener array de arrays
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`[2/3] Procesando ${data.length} filas...`);
    const insumosList = [];
    
    // Find header row index
    let headerRowIdx = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].includes('N°')) {
            headerRowIdx = i;
            break;
        }
    }
    
    const headers = data[headerRowIdx];
    const tipoIdx = headers.indexOf('TIPO');
    const numIdx = headers.indexOf('N°');
    const descIdx = headers.indexOf('DESCRIPCIÓN');
    const unidIdx = headers.indexOf('UNID.');
    const cantIdx = headers.indexOf('CANTIDAD');
    const costoIdx = headers.indexOf('COSTO');
    const totalIdx = headers.indexOf('TOTAL');

    for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const numero = row[numIdx] ? String(row[numIdx]).trim() : null;
        if (!numero) continue;
        
        const tipo = row[tipoIdx] ? String(row[tipoIdx]).trim() : '';
        const descripcion = row[descIdx] ? String(row[descIdx]).trim() : '';
        const unidad = row[unidIdx] ? String(row[unidIdx]).trim() : '';
        const cantidad = parseFloat(row[cantIdx]) || 0;
        const costo = parseFloat(row[costoIdx]) || 0;
        const total = parseFloat(row[totalIdx]) || (cantidad * costo);

        insumosList.push({
            numero,
            tipo,
            descripcion,
            unidad,
            cantidad,
            costo,
            total
        });
    }

    console.log("\n[3/3] Insertando datos de insumos en insumos_p...");
    await pool.query("BEGIN");
    await pool.query("TRUNCATE TABLE insumos_p CASCADE");
    
    const BATCH_SIZE = 500;
    for (let i = 0; i < insumosList.length; i += BATCH_SIZE) {
        const batch = insumosList.slice(i, i + BATCH_SIZE);
        const values = [];
        let query = `INSERT INTO insumos_p (numero, tipo, descripcion, unidad, cantidad_insumo_p, costo_p, total_p) VALUES `;
        let paramIndex = 1;
        const placeholders = [];
        for (const item of batch) {
            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(item.numero, item.tipo, item.descripcion, item.unidad, item.cantidad, item.costo, item.total);
        }
        query += placeholders.join(', ');
        await pool.query(query, values);
    }
    
    await pool.query("COMMIT");
    console.log(`  -> ${insumosList.length} insumos insertados con exito.`);
    
  } catch(e) {
      await pool.query("ROLLBACK");
      console.error("ERROR DURANTE ETL:", e);
  } finally {
      pool.end();
  }
}
run();
