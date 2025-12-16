const db = require('../config/db');

async function sampleQuery(req, res) {
  try {
    const result = await db.query('SELECT carnet, nombre, apellido FROM usuarios LIMIT 5');
    return res.json({ rows: result.rows });
  } catch (err) {
    console.error('sampleQuery error', err);
    return res.status(500).json({ error: 'Database query failed' });
  }
}

module.exports = { sampleQuery };
