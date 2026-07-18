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
  const itemToMaxSim = new Map(); // Maps 'numero' to highest similarity percentage

  for (const pair of pairs) {
    const num1 = pair.num_1;
    const num2 = pair.num_2;
    const sim = parseFloat(pair.sim);
    
    itemToMaxSim.set(num1, Math.max(itemToMaxSim.get(num1) || 0, sim));
    itemToMaxSim.set(num2, Math.max(itemToMaxSim.get(num2) || 0, sim));
    
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
      itemToMaxSim.set(item.numero, 100); // 100% sim with itself
    }
  }

  console.log("Calculando promedios ponderados y actualizando BD...");
  
  // Sort groups so that groups with multiple items appear first, then singletons
  groups.sort((a, b) => b.size - a.size);

  const updates = [];
  const groupMetadata = new Map(); // Maps group object reference to { name, avgPrice }

  for (const group of groups) {
    if (group.size === 0) continue;
    
    const arr = Array.from(group);
    // The predefined name is the description of the FIRST item in the group
    const firstItem = itemInfo.get(arr[0]);
    const groupName = firstItem.descripcion;
    
    let totalValue = 0;
    let totalQty = 0;
    
    for (const numero of group) {
      const item = itemInfo.get(numero);
      const qty = parseFloat(item.cantidad_insumo_p) || 0;
      const cost = parseFloat(item.costo_p) || 0;
      totalValue += (qty * cost);
      totalQty += qty;
    }
    
    const avgPrice = totalQty > 0 ? (totalValue / totalQty) : 0;
    groupMetadata.set(group, { name: groupName, avgPrice });
    
    for (const numero of group) {
      const sim = itemToMaxSim.get(numero);
      updates.push(
        pool.query('UPDATE insumos_p SET similitud_ia_porcentaje = $1, grupo_ia_sugerido = $2 WHERE numero = $3', [sim, groupName, numero])
      );
    }
  }

  // Execute all updates in parallel
  await Promise.all(updates);
  console.log(`✅ Base de datos actualizada con porcentajes de IA en ${updates.length} insumos.`);

  // Generate output as Native Excel (.xlsx)
  const xlsx = require('xlsx');
  
  // Create worksheet data with all columns
  const wsData = [
    ["Grupo Sugerido IA", "N° Original", "Descripción Original", "Unidad", "Cantidad", "Costo Unitario", "Parcial (Total)", "Tipo", "% Coincidencia", "Promedio Ponderado Grupo"] // Headers
  ];

  for (const group of groups) {
    if (group.size > 0) { // Include all groups, even size 1
      const meta = groupMetadata.get(group);
      for (const numero of group) {
        const itemObj = itemInfo.get(numero);
        const sim = itemToMaxSim.get(numero);
        wsData.push([
          meta.name, 
          numero, 
          itemObj.descripcion,
          itemObj.unidad,
          itemObj.cantidad_insumo_p,
          itemObj.costo_p,
          itemObj.total_p,
          itemObj.tipo,
          `${sim}%`,
          meta.avgPrice
        ]);
      }
    }
  }

  // Create workbook and add worksheet
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths (approximate)
  ws['!cols'] = [
    { wch: 60 }, // Grupo Nombre
    { wch: 10 }, // N°
    { wch: 60 }, // Descripción
    { wch: 10 }, // Unidad
    { wch: 12 }, // Cantidad
    { wch: 15 }, // Costo
    { wch: 15 }, // Total
    { wch: 10 }, // Tipo
    { wch: 15 }, // Coincidencia
    { wch: 25 }  // Ponderado
  ];

  xlsx.utils.book_append_sheet(wb, ws, "Agrupacion IA");

  const outputFileName = '../../Agrupacion_Insumos_Golden.xlsx';
  xlsx.writeFile(wb, outputFileName);
  console.log(`✅ Archivo Excel generado: ${outputFileName} con todos los ${allItems.length} insumos, sus coincidencias y promedios.`);

  pool.end();
}

main().catch(console.error);
