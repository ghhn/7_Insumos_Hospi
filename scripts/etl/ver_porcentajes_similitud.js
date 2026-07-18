
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function main() {
  console.log("Activando módulo de IA (Trigramas) en Supabase...");
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  
  // Set threshold to 70% similarity (0.7)
  await pool.query('SELECT set_limit(0.7);');

  console.log("Calculando porcentajes de similitud entre los 3,005 insumos...");
  // Use the % operator to utilize index if present, or just fast evaluation above threshold
  const query = `
    SELECT 
      a.descripcion as insumo_1, 
      b.descripcion as insumo_2, 
      ROUND((similarity(a.descripcion, b.descripcion) * 100)::numeric, 2) as porcentaje_similitud
    FROM insumos_p a
    JOIN insumos_p b 
      ON a.numero < b.numero
      AND a.descripcion % b.descripcion
    ORDER BY porcentaje_similitud DESC;
  `;

  const { rows } = await pool.query(query);
  console.log(`¡Listo! Se encontraron ${rows.length} parejas con más del 70% de similitud.`);

  // Generar reporte en CSV (se abre directo en Excel)
  const csvContent = "Insumo 1;Insumo 2;Similitud (%)\n" + rows.map(r => 
    `"${r.insumo_1}";"${r.insumo_2}";${r.porcentaje_similitud}%`
  ).join("\n");

  const outputFileName = '../../Similitudes_Insumos.csv';
  fs.writeFileSync(outputFileName, csvContent, 'utf-8');
  console.log(`\n✅ Archivo generado: ${outputFileName}`);
  console.log("Puedes abrirlo en Excel para chequear rápidamente los porcentajes.");

  pool.end();
}

main().catch(console.error);
