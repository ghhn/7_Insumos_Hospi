const ExcelJS = require('exceljs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.ndcqypwtkiayagkykdrx',
  password: 'Jo.9839514500gc',
  database: 'postgres',
  host: 'aws-1-us-west-1.pooler.supabase.com',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Reading Excel file...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\Legion\\Downloads\\ADQUISICIONES_IVAN.xlsx');
  const worksheet = workbook.worksheets[0];

  const rows = [];
  
  // Asumimos que la fila 1 es el header
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    // A: anio (1), B: siaf (2), C: mes (3), D: tipo_compra (4), E: num_compra (5), F: origen (6), G: detalle (7), H: unidad (8), I: cantidad (9), J: precio (10), K: parcial (11)
    
    const anio = row.getCell(1).text;
    const siaf = row.getCell(2).text;
    const mes = row.getCell(3).text;
    const tipo_compra = row.getCell(4).text;
    const num_compra = row.getCell(5).text;
    const origen = row.getCell(6).text;
    const detalle = row.getCell(7).text;
    const unidad = row.getCell(8).text;
    const cantidad_c = parseFloat(row.getCell(9).value) || 0;
    const precio_unit_c = parseFloat(row.getCell(10).value) || 0;
    const total_c = parseFloat(row.getCell(11).value) || 0;
    
    // Ignorar filas completamente vacías donde no hay detalle
    if (detalle && detalle.trim() !== '') {
        rows.push([
            anio,
            siaf,
            mes,
            tipo_compra,
            num_compra,
            origen,
            detalle,
            unidad,
            cantidad_c,
            precio_unit_c,
            total_c
        ]);
    }
  });

  console.log(`Found ${rows.length} rows to insert.`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Inserción en lote (batch) pero fila por fila dentro de la transacción por simplicidad y seguridad
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await client.query(`
        INSERT INTO compras_c (
          anio, siaf, mes, tipo_compra, num_compra, origen, detalle, unidad, cantidad_c, precio_unit_c, total_c
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, r);
      
      if ((i + 1) % 500 === 0) {
        console.log(`Inserted ${i + 1} rows...`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`Import complete. Successfully inserted ${rows.length} rows.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
