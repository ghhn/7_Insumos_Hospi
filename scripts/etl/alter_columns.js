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
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN completo TYPE TEXT;`);
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN unidad TYPE TEXT;`);
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN unidad_und TYPE TEXT;`);
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN tipo_compra TYPE TEXT;`);
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN num_compra TYPE TEXT;`);
  await pool.query(`ALTER TABLE compras_c ALTER COLUMN anio TYPE TEXT;`);
  console.log("Columnas alteradas a TEXT exitosamente.");
  pool.end();
}
run();
