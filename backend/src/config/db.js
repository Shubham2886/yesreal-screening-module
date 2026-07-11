// single shared pg pool, everything else imports this instead of making
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'yesreal_screening',
});

pool.on('error', (err) => {
  console.error('unexpected error on idle pg client', err);
});

module.exports = pool;
