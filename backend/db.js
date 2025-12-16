require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || 'postgres://postgres:postgres@localhost:5432/foro_db';

const pool = new Pool({
  connectionString,
  // enable SSL in production if DATABASE_URL mandates it
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
};
