const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const data = require('./data');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_EXPIRES = '7d';

function signToken(user) {
  const payload = { carnet: user.carnet, nombre: user.nombre, apellido: user.apellido, rol: user.rol };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ message: 'No autorizado' });
  const token = h.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// --- Auth ---
app.post('/auth/login', (req, res) => {
  const { carnet, password } = req.body || {};
  const user = data.users.find(u => String(u.carnet) === String(carnet) && u.contraseña === password);
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  const token = signToken(user);
  return res.json({ token, user: { carnet: user.carnet, nombre: user.nombre, apellido: user.apellido, correo: user.correo, foto_perfil: user.foto_perfil, biografia: user.biografia, rol: user.rol } });
});

app.post('/auth/register', (req, res) => {
  const { carnet, nombre, apellido, correo } = req.body || {};
  if (!carnet || !nombre) return res.status(400).json({ message: 'Falta datos' });
  if (data.users.find(u => u.carnet === carnet)) return res.status(400).json({ message: 'Usuario ya existe' });
  const newUser = { carnet: String(carnet), nombre, apellido, correo, contraseña: 'password123', rol: 'user', foto_perfil: null };
  data.users.push(newUser);
  const token = signToken(newUser);
  return res.json({ token, user: { carnet: newUser.carnet, nombre: newUser.nombre, apellido: newUser.apellido } });
});

// --- Users ---
app.get('/users/me', authMiddleware, (req, res) => {
  const u = data.users.find(x => String(x.carnet) === String(req.user.carnet));
  if (!u) return res.status(404).json({ message: 'No encontrado' });
  const safe = { carnet: u.carnet, nombre: u.nombre, apellido: u.apellido, correo: u.correo, foto_perfil: u.foto_perfil || null, biografia: u.biografia || null, rol: u.rol };
  res.json(safe);
});

app.get('/users/:carnet', (req, res) => {
  const c = req.params.carnet;
  const u = data.users.find(x => String(x.carnet) === String(c));
  if (!u) return res.status(404).json({ message: 'No encontrado' });
  res.json({ carnet: u.carnet, nombre: u.nombre, apellido: u.apellido, foto_perfil: u.foto_perfil || null, biografia: u.biografia || null });
});

app.get('/users/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const found = data.users.filter(u => (u.nombre + ' ' + (u.apellido || '') + ' ' + u.carnet).toLowerCase().includes(q));
  res.json(found.map(u => ({ carnet: u.carnet, nombre: u.nombre, apellido: u.apellido, foto_perfil: u.foto_perfil || null })));
});

app.patch('/users/me', authMiddleware, (req, res) => {
  const u = data.users.find(x => String(x.carnet) === String(req.user.carnet));
  if (!u) return res.status(404).json({ message: 'No encontrado' });
  const { nombre, apellido, correo, biografia, foto_perfil } = req.body || {};
  if (nombre) u.nombre = nombre;
  if (apellido) u.apellido = apellido;
  if (correo) u.correo = correo;
  if (biografia !== undefined) u.biografia = biografia;
  if (foto_perfil !== undefined) u.foto_perfil = foto_perfil;
  res.json({ carnet: u.carnet, nombre: u.nombre, apellido: u.apellido, correo: u.correo, biografia: u.biografia, foto_perfil: u.foto_perfil });
});

// --- Upload ---
app.post('/upload/image', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.json({ url });
});

// --- Posts ---
app.get('/posts', (req, res) => {
  res.json(data.posts);
});

app.get('/posts/:id', (req, res) => {
  const p = data.posts.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ message: 'No encontrado' });
  res.json(p);
});

app.post('/posts', authMiddleware, (req, res) => {
  const { titulo, archivo_url, contenido, etiquetas } = req.body || {};
  const newP = { id: uuidv4(), titulo: titulo || 'Publicación', descripcion: titulo || '', archivo_url: archivo_url || null, contenido: contenido || 'text', fecha_publicacion: new Date().toISOString(), carnet_usuario: req.user.carnet, etiquetas: etiquetas || [], likes_count: 0, comentarios_count: 0 };
  data.posts.unshift(newP);
  res.json(newP);
});

app.delete('/posts/:id', authMiddleware, (req, res) => {
  const idx = data.posts.findIndex(x => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
  const post = data.posts[idx];
  // allow admins or owner
  if (req.user.carnet !== post.carnet_usuario && req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  data.posts.splice(idx, 1);
  res.json({});
});

app.post('/posts/:id/report', authMiddleware, (req, res) => {
  const { motivo, detalle } = req.body || {};
  const rep = { id: uuidv4(), tipo_reporte: 'publicacion', publicacion_id: req.params.id, motivo, detalle, created_at: new Date().toISOString(), carnet_reporta: req.user.carnet };
  data.reports.unshift(rep);
  res.json({});
});

// --- Comments ---
app.get('/comments', (req, res) => {
  const postId = req.query.postId;
  if (!postId) return res.json([]);
  const rows = data.comments.filter(c => String(c.publicacion_id) === String(postId));
  res.json(rows);
});

app.post('/comments', authMiddleware, (req, res) => {
  const { postId, texto } = req.body || {};
  if (!postId || !texto) return res.status(400).json({ message: 'Falta datos' });
  const newC = { id: uuidv4(), publicacion_id: postId, usuario_carnet: req.user.carnet, texto, created_at: new Date().toISOString(), likes_count: 0 };
  data.comments.push(newC);
  // increment post counter
  const p = data.posts.find(x => String(x.id) === String(postId));
  if (p) p.comentarios_count = (p.comentarios_count || 0) + 1;
  res.json(newC);
});

app.delete('/comments/:id', authMiddleware, (req, res) => {
  const idx = data.comments.findIndex(c => String(c.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
  const c = data.comments[idx];
  if (c.usuario_carnet !== req.user.carnet && req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  data.comments.splice(idx, 1);
  const p = data.posts.find(x => String(x.id) === String(c.publicacion_id));
  if (p) p.comentarios_count = Math.max(0, (p.comentarios_count || 1) - 1);
  res.json({});
});

// replies
app.get('/comments/:id/replies', (req, res) => {
  const commentId = req.params.id;
  const rows = data.replies.filter(r => String(r.comentario_id) === String(commentId));
  res.json(rows);
});

app.post('/comments/:id/replies', authMiddleware, (req, res) => {
  const commentId = req.params.id;
  const { texto } = req.body || {};
  if (!texto) return res.status(400).json({ message: 'Falta texto' });
  const newR = { id: uuidv4(), comentario_id: commentId, usuario_carnet: req.user.carnet, texto, created_at: new Date().toISOString(), likes_count: 0 };
  data.replies.push(newR);
  res.json(newR);
});

app.delete('/comments/replies/:id', authMiddleware, (req, res) => {
  const idx = data.replies.findIndex(r => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
  const r = data.replies[idx];
  if (r.usuario_carnet !== req.user.carnet && req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  data.replies.splice(idx, 1);
  res.json({});
});

// --- Likes (posts) ---
app.get('/likes/state', authMiddleware, (req, res) => {
  const postId = req.query.postId;
  const count = data.likes.filter(l => String(l.publicacion_id) === String(postId)).length;
  const liked = data.likes.some(l => String(l.publicacion_id) === String(postId) && String(l.usuario_carnet) === String(req.user.carnet));
  res.json({ liked, count });
});

app.post('/likes', authMiddleware, (req, res) => {
  const { postId } = req.body || {};
  if (!postId) return res.status(400).json({ message: 'Falta postId' });
  if (!data.likes.some(l => String(l.publicacion_id) === String(postId) && String(l.usuario_carnet) === String(req.user.carnet))) {
    data.likes.push({ id: uuidv4(), publicacion_id: postId, usuario_carnet: req.user.carnet });
    const p = data.posts.find(x => String(x.id) === String(postId));
    if (p) p.likes_count = (p.likes_count || 0) + 1;
  }
  const count = data.likes.filter(l => String(l.publicacion_id) === String(postId)).length;
  const liked = data.likes.some(l => String(l.publicacion_id) === String(postId) && String(l.usuario_carnet) === String(req.user.carnet));
  res.json({ liked, count });
});

app.delete('/likes', authMiddleware, (req, res) => {
  const postId = req.query.postId;
  const idx = data.likes.findIndex(l => String(l.publicacion_id) === String(postId) && String(l.usuario_carnet) === String(req.user.carnet));
  if (idx !== -1) {
    data.likes.splice(idx, 1);
    const p = data.posts.find(x => String(x.id) === String(postId));
    if (p) p.likes_count = Math.max(0, (p.likes_count || 1) - 1);
  }
  const count = data.likes.filter(l => String(l.publicacion_id) === String(postId)).length;
  const liked = data.likes.some(l => String(l.publicacion_id) === String(postId) && String(l.usuario_carnet) === String(req.user.carnet));
  res.json({ liked, count });
});

// --- Likes comments/replies (simple) ---
app.get('/likes/comments/state', authMiddleware, (req, res) => {
  const commentId = req.query.commentId;
  const count = data.commentLikes.filter(l => String(l.commentId) === String(commentId)).length;
  const liked = data.commentLikes.some(l => String(l.commentId) === String(commentId) && String(l.usuario_carnet) === String(req.user.carnet));
  res.json({ liked, count });
});
app.post('/likes/comments', authMiddleware, (req, res) => {
  const { commentId } = req.body || {};
  if (!commentId) return res.status(400).json({ message: 'Falta commentId' });
  data.commentLikes.push({ id: uuidv4(), commentId, usuario_carnet: req.user.carnet });
  const count = data.commentLikes.filter(l => String(l.commentId) === String(commentId)).length;
  res.json({ liked: true, count });
});
app.delete('/likes/comments', authMiddleware, (req, res) => {
  const commentId = req.query.commentId;
  const idx = data.commentLikes.findIndex(l => String(l.commentId) === String(commentId) && String(l.usuario_carnet) === String(req.user.carnet));
  if (idx !== -1) data.commentLikes.splice(idx, 1);
  const count = data.commentLikes.filter(l => String(l.commentId) === String(commentId)).length;
  res.json({ liked: false, count });
});

// replies likes
app.get('/likes/replies/state', authMiddleware, (req, res) => {
  const replyId = req.query.replyId;
  const count = data.replyLikes.filter(l => String(l.replyId) === String(replyId)).length;
  const liked = data.replyLikes.some(l => String(l.replyId) === String(replyId) && String(l.usuario_carnet) === String(req.user.carnet));
  res.json({ liked, count });
});
app.post('/likes/replies', authMiddleware, (req, res) => {
  const { replyId } = req.body || {};
  data.replyLikes.push({ id: uuidv4(), replyId, usuario_carnet: req.user.carnet });
  const count = data.replyLikes.filter(l => String(l.replyId) === String(replyId)).length;
  res.json({ liked: true, count });
});
app.delete('/likes/replies', authMiddleware, (req, res) => {
  const replyId = req.query.replyId;
  const idx = data.replyLikes.findIndex(l => String(l.replyId) === String(replyId) && String(l.usuario_carnet) === String(req.user.carnet));
  if (idx !== -1) data.replyLikes.splice(idx, 1);
  const count = data.replyLikes.filter(l => String(l.replyId) === String(replyId)).length;
  res.json({ liked: false, count });
});

// --- Products ---
app.get('/products', (req, res) => {
  res.json(data.products);
});

app.get('/products/:id', (req, res) => {
  const p = data.products.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ message: 'No encontrado' });
  res.json(p);
});

app.post('/products', authMiddleware, (req, res) => {
  const payload = req.body || {};
  const newP = { id: uuidv4(), ...payload, usuario_carnet: req.user.carnet, fecha_publicacion: new Date().toISOString() };
  data.products.unshift(newP);
  res.json(newP);
});

app.delete('/products/:id', authMiddleware, (req, res) => {
  const idx = data.products.findIndex(x => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
  const p = data.products[idx];
  if (p.usuario_carnet !== req.user.carnet && req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  data.products.splice(idx, 1);
  res.json({});
});

app.post('/products/:id/report', authMiddleware, (req, res) => {
  const rep = { id: uuidv4(), tipo_reporte: 'producto', producto_id: req.params.id, motivo: req.body.motivo, detalle: req.body.detalle, created_at: new Date().toISOString(), carnet_reporta: req.user.carnet };
  data.reports.unshift(rep);
  res.json({});
});

// --- Notifications ---
app.get('/notifications', (req, res) => {
  const tipo = req.query.tipo;
  const unread = req.query.unread === 'true';
  let rows = data.notifications;
  if (tipo) rows = rows.filter(r => r.tipo === tipo);
  if (unread) rows = rows.filter(r => !r.leido);
  if (req.query.limit) rows = rows.slice(0, Number(req.query.limit));
  res.json(rows);
});

app.patch('/notifications/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const n = data.notifications.find(x => String(x.id) === String(id));
  if (!n) return res.status(404).json({});
  n.leido = true;
  res.json({});
});

// --- Admin reports ---
app.get('/admin/reports', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const limit = Number(req.query.limit || 200);
  res.json(data.reports.slice(0, limit));
});

app.delete('/admin/reports/:id', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const idx = data.reports.findIndex(r => String(r.id) === String(req.params.id));
  if (idx !== -1) data.reports.splice(idx, 1);
  res.json({});
});

app.post('/admin/moderation/delete', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { contentType, contentId, reportId, motivo, detalle, base_reglamentaria, enlace } = req.body || {};
  if (contentType === 'publicacion') {
    const idx = data.posts.findIndex(p => String(p.id) === String(contentId));
    if (idx !== -1) data.posts.splice(idx, 1);
  } else if (contentType === 'producto') {
    const idx = data.products.findIndex(p => String(p.id) === String(contentId));
    if (idx !== -1) data.products.splice(idx, 1);
  }
  // remove related reports
  for (let i = data.reports.length - 1; i >= 0; i--) {
    const r = data.reports[i];
    if (String(r.publicacion_id) === String(contentId) || String(r.producto_id) === String(contentId) || String(r.id_contenido) === String(contentId)) data.reports.splice(i, 1);
  }
  // add notification to user if available
  const targetCarnet = req.body.targetCarnet || null;
  if (targetCarnet) {
    data.notifications.unshift({ id: uuidv4(), carnet: targetCarnet, tipo: contentType === 'producto' ? 'producto_eliminado' : 'publicacion_eliminada', titulo: 'Contenido eliminado', mensaje: detalle || motivo || '', data: { contentId }, leido: false, created_at: new Date().toISOString() });
  }
  res.json({});
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock backend listening on http://localhost:${PORT}`));
