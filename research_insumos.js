const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});
async function main() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  const { rows } = await pool.query("SELECT descripcion, similarity(descripcion, 'CEMENTO PORTLAND TIPO I (42.5KG)') as sim FROM insumos_p ORDER BY sim DESC LIMIT 5");
  console.log(rows);
  pool.end();
}
main();
