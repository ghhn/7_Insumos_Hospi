const fs = require('fs');
const xlsx = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: '../../frontend/.env' });

let dbUrl = process.env.DATABASE_URL;
if (!process.env.DB_USER) {
    require('dotenv').config({ path: './frontend/.env' });
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
});

async function run() {
  console.log("==================================================");
  console.log("ETL COMPRAS: CARGANDO NUEVA_DATA.xlsx -> compras_c");
  console.log("==================================================");

  try {
    const excelPath = fs.existsSync('NUEVA_DATA.xlsx') ? 'NUEVA_DATA.xlsx' : '../../NUEVA_DATA.xlsx';
    console.log("[1/4] Leyendo", excelPath);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`[2/4] Procesando ${data.length} filas...`);
    const comprasList = [];
    
    for (const row of data) {
        // Mapear los nombres de columna del Excel a las propiedades de compras_c
        const anio = row['AÑO (C)'] ? String(row['AÑO (C)']).trim() : '2024';
        const componente = row['PROCEDENCIA'] ? String(row['PROCEDENCIA']).trim() : '';
        const detalle = row['DETALLE COMPRA'] ? String(row['DETALLE COMPRA']).trim() : (row['DESCRIPCION (P)'] || '');
        const unidad = row['UNIDAD (C)'] ? String(row['UNIDAD (C)']).trim() : (row['UNIDAD (P)'] || '');
        const cantidad_c = parseFloat(row['CANTIDAD ©']) || 0;
        const precio_unit_c = parseFloat(row['PU (C)']) || 0;
        const total_c = parseFloat(row['EXP. (C)']) || (cantidad_c * precio_unit_c);
        const tipo_compra = row['TIPO (C)'] ? String(row['TIPO (C)']).trim() : '';
        const num_compra = row['ORDEN/DOC'] ? String(row['ORDEN/DOC']).trim() : '';
        const completo = row['OPINION/COMENTARIO'] ? String(row['OPINION/COMENTARIO']).trim() : '';

        // Ignoramos filas totalmente vacias o que no son compras reales
        if (!detalle && cantidad_c === 0) continue;

        comprasList.push({
            anio,
            componente,
            detalle,
            unidad,
            cantidad_c,
            precio_unit_c,
            total_c,
            tipo_compra,
            num_compra,
            completo,
            // Inicializar las columnas editables del usuario
            unidad_und: unidad,
            cantidad_und: cantidad_c,
            precio_und: precio_unit_c
        });
    }

    console.log("\n[3/4] Truncando tabla compras_c...");
    await pool.query("BEGIN");
    await pool.query("TRUNCATE TABLE compras_c CASCADE");
    
    console.log("\n[4/4] Insertando datos de compras...");
    const BATCH_SIZE = 500;
    for (let i = 0; i < comprasList.length; i += BATCH_SIZE) {
        const batch = comprasList.slice(i, i + BATCH_SIZE);
        const values = [];
        let query = `INSERT INTO compras_c (anio, componente, detalle, unidad, cantidad_c, precio_unit_c, total_c, tipo_compra, num_compra, completo, unidad_und, cantidad_und, precio_und) VALUES `;
        let paramIndex = 1;
        const placeholders = [];
        for (const c of batch) {
            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(c.anio, c.componente, c.detalle, c.unidad, c.cantidad_c, c.precio_unit_c, c.total_c, c.tipo_compra, c.num_compra, c.completo, c.unidad_und, c.cantidad_und, c.precio_und);
        }
        query += placeholders.join(', ');
        await pool.query(query, values);
    }
    
    await pool.query("COMMIT");
    console.log(`  -> ${comprasList.length} compras insertadas.`);
    console.log("\n¡ETL DE COMPRAS FINALIZADO CON EXITO!");
    
  } catch(e) {
      await pool.query("ROLLBACK");
      console.error("ERROR DURANTE ETL DE COMPRAS:", e);
  } finally {
      pool.end();
  }
}
run();
