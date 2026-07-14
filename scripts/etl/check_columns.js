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
  const res = await pool.query(`
    SELECT column_name, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'compras_c' AND data_type = 'character varying'
  `);
  console.log(res.rows);
  pool.end();
}
run();
