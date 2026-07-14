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
  try {
    await pool.query("BEGIN");
    
    console.log("Borrando vistas...");
    await pool.query(`DROP VIEW IF EXISTS insumos_resumen CASCADE;`);

    console.log("Borrando tablas obsoletas (acus, partidas_p)...");
    await pool.query(`DROP TABLE IF EXISTS acus CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS partidas_p CASCADE;`);

    console.log("Truncando tabla insumos_p...");
    await pool.query(`TRUNCATE TABLE insumos_p CASCADE;`);
    
    console.log("Alterando tabla insumos_p...");
    // Intentar renombrar la columna si existe, si no asumimos que ya se llamaba numero.
    // Tambien agregar la columna tipo.
    await pool.query(`ALTER TABLE insumos_p RENAME COLUMN codigo TO numero;`).catch(e => console.log("Columna codigo ya renombrada a numero o no existe."));
    await pool.query(`ALTER TABLE insumos_p ADD COLUMN IF NOT EXISTS tipo TEXT;`);
    
    // Y debemos vaciar estado_cuadre_insumos tambien.
    await pool.query(`TRUNCATE TABLE estado_cuadre_insumos CASCADE;`);

    console.log("Creando tablas de estandarizacion...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insumos_estandarizados_c (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo_estandar TEXT UNIQUE NOT NULL,
          descripcion_estandar TEXT NOT NULL,
          unidad_estandar TEXT NOT NULL,
          precio_ponderado_c NUMERIC DEFAULT 0
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agrupacion_insumos_c (
          id SERIAL PRIMARY KEY,
          numero_insumo_original TEXT UNIQUE REFERENCES insumos_p(numero) ON DELETE CASCADE,
          codigo_estandar_fk UUID REFERENCES insumos_estandarizados_c(id) ON DELETE CASCADE,
          factor_conversion NUMERIC DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Recreando la vista insumos_resumen con logica plana...");
    // The new logic: 
    // We group by standard code (from agrupacion_insumos_c) if it exists, otherwise use the original numero.
    // If standardized, we multiply original quantity by conversion factor.
    // Price will be the standard price.
    await pool.query(`
      CREATE OR REPLACE VIEW insumos_resumen AS
      SELECT 
          COALESCE(est.codigo_estandar, p.numero) AS codigo_insumo,
          COALESCE(est.descripcion_estandar, p.descripcion) AS descripcion_insumo,
          COALESCE(est.unidad_estandar, p.unidad) AS unidad,
          
          -- Suma total de cantidad_insumo_p aplicando el factor de conversion
          SUM(p.cantidad_insumo_p * COALESCE(agr.factor_conversion, 1.0)) AS cantidad_requerida_p,
          
          -- El precio lo sacamos del estandar, o usamos el original. Como sumamos, usamos MAX(precio_ponderado_c) o AVG (debe ser el mismo por grupo)
          MAX(COALESCE(est.precio_ponderado_c, p.costo_p)) AS precio_p,
          
          -- Cantidad_requerida_c la mapearemos igual a la cantidad_p porque ya no hay APUs modificables.
          -- Si luego quieren modificar la meta global, tendran otra columna. Por ahora sera igual.
          SUM(p.cantidad_insumo_p * COALESCE(agr.factor_conversion, 1.0)) AS cantidad_requerida_c,
          
          COALESCE(MAX(e.estado), 'Pendiente') AS estado,
          MAX(e.comentario) AS comentario
      FROM insumos_p p
      LEFT JOIN agrupacion_insumos_c agr ON p.numero = agr.numero_insumo_original
      LEFT JOIN insumos_estandarizados_c est ON agr.codigo_estandar_fk = est.id
      LEFT JOIN estado_cuadre_insumos e ON p.numero = e.codigo_insumo
      GROUP BY 
          COALESCE(est.codigo_estandar, p.numero),
          COALESCE(est.descripcion_estandar, p.descripcion),
          COALESCE(est.unidad_estandar, p.unidad);
    `);

    await pool.query("COMMIT");
    console.log("Fase 1 completada con exito.");
  } catch (e) {
    await pool.query("ROLLBACK");
    console.error("Error en Fase 1:", e);
  } finally {
    pool.end();
  }
}

run();
