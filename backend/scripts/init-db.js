require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function run() {
  try {
    const sqlPath = path.join(__dirname, '..', 'sql', 'schema_completo.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('No se encontró sql/schema_completo.sql; copia tu schema allí o ajusta la ruta.');
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Ejecutando schema...');
    await db.query(sql);
    console.log('Schema ejecutado correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error inicializando DB:', err);
    process.exit(1);
  }
}

run();
