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
  
  // Set threshold to 80% similarity (0.8) to avoid false positives in groups
  await pool.query('SELECT set_limit(0.8);');

  console.log("Obteniendo todos los 3005 insumos...");
  const { rows: allItems } = await pool.query('SELECT * FROM insumos_p ORDER BY numero;');

  console.log("Calculando similitudes...");
  const query = `
    SELECT 
      a.numero as num_1, 
      b.numero as num_2, 
      ROUND((similarity(a.descripcion, b.descripcion) * 100)::numeric, 2) as sim
    FROM insumos_p a
    JOIN insumos_p b 
      ON a.numero < b.numero
      AND a.descripcion % b.descripcion
    ORDER BY sim DESC;
  `;

  const { rows: pairs } = await pool.query(query);

  // Greedy Clustering using 'numero' as the unique identifier
  const groups = []; // Array of Sets (storing 'numero')
  const itemToGroupIndex = new Map(); // Maps 'numero' to group index

  for (const pair of pairs) {
    const num1 = pair.num_1;
    const num2 = pair.num_2;
    
    const idx1 = itemToGroupIndex.get(num1);
    const idx2 = itemToGroupIndex.get(num2);

    if (idx1 === undefined && idx2 === undefined) {
      // Create new group
      const newGroupIndex = groups.length;
      groups.push(new Set([num1, num2]));
      itemToGroupIndex.set(num1, newGroupIndex);
      itemToGroupIndex.set(num2, newGroupIndex);
    } else if (idx1 !== undefined && idx2 === undefined) {
      // Add num2 to num1's group
      groups[idx1].add(num2);
      itemToGroupIndex.set(num2, idx1);
    } else if (idx1 === undefined && idx2 !== undefined) {
      // Add num1 to num2's group
      groups[idx2].add(num1);
      itemToGroupIndex.set(num1, idx2);
    }
  }

  // Create a quick lookup for description by numero
  const itemInfo = new Map();
  for (const item of allItems) {
    itemInfo.set(item.numero, item);
    // If an item was never added to any group (it has no similar pairs), create a unique group for it
    if (!itemToGroupIndex.has(item.numero)) {
      const newGroupIndex = groups.length;
      groups.push(new Set([item.numero]));
      itemToGroupIndex.set(item.numero, newGroupIndex);
    }
  }

  // Generate output as Native Excel (.xlsx)
  const xlsx = require('xlsx');
  
  // Create worksheet data with all columns
  const wsData = [
    ["Grupo ID", "N°", "Descripción Original", "Unidad", "Cantidad", "Costo Unitario", "Parcial (Total)", "Tipo"] // Headers
  ];

  let groupId = 1;
  // Sort groups so that groups with multiple items appear first, then singletons
  groups.sort((a, b) => b.size - a.size);

  for (const group of groups) {
    if (group.size > 0) { // Include all groups, even size 1
      for (const numero of group) {
        const itemObj = itemInfo.get(numero);
        wsData.push([
          `Grupo ${groupId}`, 
          numero, 
          itemObj.descripcion,
          itemObj.unidad,
          itemObj.cantidad_insumo_p,
          itemObj.costo_p,
          itemObj.total_p,
          itemObj.tipo
        ]);
      }
      groupId++;
    }
  }

  // Create workbook and add worksheet
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths (approximate)
  ws['!cols'] = [
    { wch: 15 }, // Grupo ID
    { wch: 10 }, // N°
    { wch: 70 }, // Descripción
    { wch: 10 }, // Unidad
    { wch: 12 }, // Cantidad
    { wch: 15 }, // Costo
    { wch: 15 }, // Total
    { wch: 10 }  // Tipo
  ];

  xlsx.utils.book_append_sheet(wb, ws, "Agrupacion Insumos");

  const outputFileName = '../../Agrupacion_Insumos_Golden.xlsx';
  xlsx.writeFile(wb, outputFileName);
  console.log(`✅ Archivo Excel generado: ${outputFileName} con todos los ${allItems.length} insumos y sus columnas.`);

  pool.end();
}

main().catch(console.error);
