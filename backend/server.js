require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const db = require('./src/config/db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve uploads if present
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// mount routes
app.use('/auth', authRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// Endpoint simple para verificar conexión DB desde el navegador/Postman
app.get('/health-db', async (req, res) => {
	try {
		const r = await db.query('SELECT 1 as ok');
		return res.json({ ok: true, db: r.rows?.[0] || null });
	} catch (err) {
		return res.status(500).json({ ok: false, error: err?.message || String(err) });
	}
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
	console.log(`Backend (PG) listening on http://localhost:${PORT}`);
	const ok = await db.testConnection();
	if (!ok) console.warn('DB test failed at startup — verify .env and network');
});
