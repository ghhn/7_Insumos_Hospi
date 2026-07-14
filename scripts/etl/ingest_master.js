const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: '../../frontend/.env' });

// Ensure dotenv loaded correctly by checking if variables exist. If not, try fallback.
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
  console.log("ETL SINGLE SOURCE OF TRUTH: RECONSTRUYENDO BD DESDE JSON");
  console.log("==================================================");

  try {
    // PASO 1: Leer el archivo APUS_Extraidos.json
    console.log("[1/5] Leyendo APUS_Extraidos.json...");
    // We are running this from root or scripts/etl so we should find the json in root
    const jsonPath = fs.existsSync('APUS_Extraidos.json') ? 'APUS_Extraidos.json' : '../../APUS_Extraidos.json';
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const apus = JSON.parse(rawData);

    // PASO 2: Procesar la logica de Negocio
    console.log(`[2/5] Procesando ${apus.length} filas del APU...`);
    const partidasMap = new Map();
    const insumosMap = new Map();
    const acusList = [];

    for (const row of apus) {
        if (!row.Partida_Codigo || !row.Insumo_Codigo) continue;

        const codPartida = row.Partida_Codigo.trim();
        const codInsumo = row.Insumo_Codigo.toString().trim();
        // NOTA: Históricamente, el campo 'Partida_Costo_Unitario' en este JSON almacenó el METRADO debido a cómo se exportó el S10.
        const metradoPartida = parseFloat(row.Partida_Costo_Unitario || 0);

        // 1. Guardar Partida Única
        if (!partidasMap.has(codPartida)) {
            partidasMap.set(codPartida, {
                item: codPartida,
                descripcion: row.Partida_Descripcion || '',
                unidad: row.Partida_Unidad || '',
                cantidad_p: metradoPartida,
                precio_unitario_p: 0, // Se calcularía después si fuera necesario
                total_p: 0, 
                rendimiento_p: row.Partida_Rendimiento || ''
            });
        }

        // 2. Acumular Insumo Único
        const incidencia = parseFloat(row.Insumo_Cantidad || 0);
        const precio = parseFloat(row.Insumo_Precio || 0);
        const cantidadAportada = incidencia * metradoPartida;
        const totalAportado = cantidadAportada * precio;

        if (!insumosMap.has(codInsumo)) {
            insumosMap.set(codInsumo, {
                codigo: codInsumo,
                descripcion: row.Insumo_Descripcion || '',
                unidad: row.Insumo_Unidad || '',
                cantidad_insumo_p: 0,
                costo_p: precio,
                total_p: 0
            });
        }
        
        const insumoRef = insumosMap.get(codInsumo);
        insumoRef.cantidad_insumo_p += cantidadAportada;
        insumoRef.total_p += totalAportado;

        // 3. Guardar el ACU (Relación 1 a 1)
        acusList.push({
            item_partida: codPartida,
            tipo: row.Tipo_Insumo || '',
            codigo_insumo: codInsumo,
            descripcion_insumo: row.Insumo_Descripcion || '',
            unidad: row.Insumo_Unidad || '',
            recursos: row.Insumo_Recursos ? parseFloat(row.Insumo_Recursos) : 0,
            cantidad_p: incidencia,
            precio_p: precio,
            parcial_p: row.Insumo_Parcial ? parseFloat(row.Insumo_Parcial) : (incidencia * precio)
        });
    }

    console.log(`  -> Partidas únicas: ${partidasMap.size}`);
    console.log(`  -> Insumos únicos en catálogo: ${insumosMap.size}`);
    console.log(`  -> Filas de ACU a insertar: ${acusList.length}`);

    // PASO 3: Truncar Tablas en Supabase
    console.log("\n[3/5] Truncando tablas en Supabase...");
    await pool.query("BEGIN");
    
    // El orden importa por las llaves foráneas si existieran
    await pool.query("TRUNCATE TABLE estado_cuadre_insumos CASCADE");
    await pool.query("TRUNCATE TABLE mapeo_vinculacion CASCADE");
    await pool.query("TRUNCATE TABLE compras_c CASCADE");
    await pool.query("TRUNCATE TABLE acus CASCADE");
    await pool.query("TRUNCATE TABLE insumos_p CASCADE");
    await pool.query("TRUNCATE TABLE partidas_p CASCADE");
    console.log("  -> Base de datos limpia.");

    // PASO 4: Insertar Datos
    console.log("\n[4/5] Insertando nueva data...");
    
    // A) Insertar Partidas
    for (const p of partidasMap.values()) {
        await pool.query(`
            INSERT INTO partidas_p (item, descripcion, unidad, cantidad_p, precio_unitario_p, total_p, rendimiento_p)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [p.item, p.descripcion, p.unidad, p.cantidad_p, p.precio_unitario_p, p.total_p, p.rendimiento_p]);
    }
    console.log(`  -> ${partidasMap.size} partidas insertadas.`);

    // B) Insertar Insumos
    for (const i of insumosMap.values()) {
        await pool.query(`
            INSERT INTO insumos_p (codigo, descripcion, unidad, cantidad_insumo_p, costo_p, total_p)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [i.codigo, i.descripcion, i.unidad, i.cantidad_insumo_p, i.costo_p, i.total_p]);
    }
    console.log(`  -> ${insumosMap.size} insumos insertados.`);

    // C) Insertar ACUs (en lotes para no saturar la memoria/red)
    const BATCH_SIZE = 500;
    for (let i = 0; i < acusList.length; i += BATCH_SIZE) {
        const batch = acusList.slice(i, i + BATCH_SIZE);
        // Construimos el query bulk insert
        const values = [];
        let query = `INSERT INTO acus (item_partida, tipo, codigo_insumo, descripcion_insumo, unidad, recursos, cantidad_p, precio_p, parcial_p) VALUES `;
        let paramIndex = 1;
        const placeholders = [];
        for (const a of batch) {
            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(a.item_partida, a.tipo, a.codigo_insumo, a.descripcion_insumo, a.unidad, a.recursos, a.cantidad_p, a.precio_p, a.parcial_p);
        }
        query += placeholders.join(', ');
        await pool.query(query, values);
    }
    console.log(`  -> ${acusList.length} ACUs insertados.`);

    await pool.query("COMMIT");
    console.log("\n[5/5] ¡ETL FINALIZADO CON ÉXITO!");

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("\n❌ ERROR DURANTE EL ETL:", error);
  } finally {
    await pool.end();
  }
}

run();
