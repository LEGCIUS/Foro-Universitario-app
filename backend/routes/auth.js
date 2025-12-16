const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const { sendEmail } = require('../src/utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_EXPIRES = '7d';

function signToken(user) {
  const payload = { carnet: user.carnet, nombre: user.nombre, apellido: user.apellido, rol: user.rol || (user.es_admin ? 'admin' : 'user') };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { carnet, nombre, apellido, correo, password } = req.body || {};

    const carnetStr = String(carnet || '').trim();
    const nombreStr = String(nombre || '').trim();
    const apellidoStr = String(apellido || '').trim();
    const correoStr = String(correo || '').trim().toLowerCase();

    if (!carnetStr || !nombreStr || !apellidoStr || !correoStr) {
      return res.status(400).json({ message: 'Faltan campos requeridos', required: ['carnet', 'nombre', 'apellido', 'correo'] });
    }

    const existing = await db.query('SELECT carnet, correo FROM usuarios WHERE carnet = $1 OR correo = $2', [carnetStr, correoStr]);
    if (existing.rows.length) {
      const sameCarnet = existing.rows.some((r) => String(r.carnet) === carnetStr);
      const sameCorreo = existing.rows.some((r) => String(r.correo || '').toLowerCase() === correoStr);
      if (sameCarnet) return res.status(400).json({ message: 'El carnet ya está registrado' });
      if (sameCorreo) return res.status(400).json({ message: 'El correo ya está registrado' });
      return res.status(400).json({ message: 'Usuario ya existe' });
    }

    // Si el frontend no envía contraseña, generamos una contraseña aleatoria segura.
    function generatePassword(len = 10) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = crypto.randomBytes(len);
      let out = '';
      for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
      return out;
    }

    const effectivePassword = String(password || generatePassword(10));
    const hash = await bcrypt.hash(effectivePassword, 10);
    await db.query(
      `INSERT INTO usuarios (carnet, nombre, apellido, correo, contrasena, es_admin, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,false,NOW(),NOW())`,
      [carnetStr, nombreStr, apellidoStr, correoStr, hash]
    );

    const user = { carnet: carnetStr, nombre: nombreStr, apellido: apellidoStr, correo: correoStr };
    const token = signToken(user);

    // Enviar email con contraseña temporal (opción A). No bloquear el registro si falla el envío.
    (async () => {
      try {
        const subject = 'Bienvenido a Foro Universitario';
        const txt = `Hola ${nombreStr},\n\nTu cuenta ha sido creada. Tu contraseña inicial es: ${effectivePassword}\n\nPor favor cámbiala en la configuración después de iniciar sesión.`;
        const html = `<p>Hola <strong>${nombreStr}</strong>,</p><p>Tu cuenta ha sido creada. Tu contraseña inicial es: <strong>${effectivePassword}</strong></p><p>Por favor cámbiala en la configuración después de iniciar sesión.</p>`;
        const r = await sendEmail({ to: correoStr, subject, text: txt, html });
        if (!r.ok) console.warn('No se pudo enviar email de registro', r.error);
        if (r.previewUrl) console.log('Registro email preview:', r.previewUrl);
      } catch (err) {
        console.error('Error enviando email de registro', err && err.message);
      }
    })();

    return res.json({
      token,
      user,
      passwordHint: password ? undefined : 'Tu contraseña inicial es tu carnet. Cámbiala en configuración.'
    });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ message: 'Error interno' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { carnet, password } = req.body || {};
    if (!carnet || !password) return res.status(400).json({ message: 'Faltan campos' });

    const r = await db.query('SELECT carnet, nombre, apellido, correo, contrasena, es_admin FROM usuarios WHERE carnet = $1', [String(carnet)]);
    const userRow = r.rows[0];
    if (!userRow) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(String(password), userRow.contrasena);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = { carnet: userRow.carnet, nombre: userRow.nombre, apellido: userRow.apellido, correo: userRow.correo, rol: userRow.es_admin ? 'admin' : 'user' };
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Error interno' });
  }
});

module.exports = router;
