require('dotenv').config();
const { Pool } = require('pg');

const HOST = process.env.DB_HOST || 'localhost';
const PORT = Number(process.env.DB_PORT || 5432);
const DATABASE = process.env.DB_NAME || 'gamabasis_forou';
const USER = process.env.DB_USER || 'gamabasis_forou';
const PASSWORD = process.env.DB_PASSWORD || '';

// PostgreSQL 9.6 in NTC Hosting does not use SSL by default
const pool = new Pool({
  host: HOST,
  port: PORT,
  database: DATABASE,
  user: USER,
  password: PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    // bubble up error for controller to handle
    throw err;
  }
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  try {
    const r = await query('SELECT 1 as ok');
    console.log('Postgres connection OK:', r.rows[0]);
    return true;
  } catch (err) {
    console.error('Postgres connection failed:', err.message || err);
    return false;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
