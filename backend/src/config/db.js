require('dotenv').config();
const { Pool } = require('pg');

const HOST = process.env.DB_HOST || 'localhost';
const PORT = Number(process.env.DB_PORT || 5432);
const DATABASE = process.env.DB_NAME || 'gamabasis_forou';
const USER = process.env.DB_USER || 'gamabasis_forou';
const PASSWORD = process.env.DB_PASSWORD || '';

// Requisito: PostgreSQL 9.6 (NTC) sin SSL por defecto
const pool = new Pool({
  host: HOST,
  port: PORT,
  database: DATABASE,
  user: USER,
  password: PASSWORD,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente Postgres (idle):', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  try {
    const r = await query('SELECT 1 as ok');
    console.log('Conexión a Postgres OK:', r.rows?.[0]);
    return true;
  } catch (err) {
    console.error('Conexión a Postgres FALLÓ:', err?.message || err);
    return false;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
