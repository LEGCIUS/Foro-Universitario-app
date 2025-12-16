const { v4: uuidv4 } = require('uuid');

// Seed users (passwords in clear text for the mock)
const users = [
  { carnet: '2020001', nombre: 'Admin', apellido: 'Uno', correo: 'admin@example.com', contraseña: 'password123', rol: 'admin', foto_perfil: null, biografia: 'Administrador' },
  { carnet: '2020002', nombre: 'Juan', apellido: 'Perez', correo: 'juan@example.com', contraseña: 'password123', rol: 'user', foto_perfil: null },
  { carnet: '2020003', nombre: 'Ana', apellido: 'Gomez', correo: 'ana@example.com', contraseña: 'password123', rol: 'user', foto_perfil: null },
];

const posts = [
  { id: uuidv4(), titulo: 'Bienvenidos', descripcion: 'Primer post', archivo_url: null, contenido: 'text', fecha_publicacion: new Date().toISOString(), carnet_usuario: '2020002', etiquetas: ['inicio'], likes_count: 0, comentarios_count: 0 },
];

const comments = [];
const replies = [];
const likes = [];
const commentLikes = [];
const replyLikes = [];
const products = [];
const reports = [];
const notifications = [];

module.exports = {
  users,
  posts,
  comments,
  replies,
  likes,
  commentLikes,
  replyLikes,
  products,
  reports,
  notifications,
};
