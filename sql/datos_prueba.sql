-- ========================================
-- DATOS DE EJEMPLO PARA TESTING
-- Foro Universitario App
-- ========================================
-- Este script inserta datos de prueba para testing
-- Ejecutar DESPUÉS del schema_completo.sql

-- ========================================
-- 1. USUARIOS DE PRUEBA
-- ========================================

-- Usuario administrador
INSERT INTO usuarios (carnet, nombre, apellido, correo, contrasena, es_admin, biografia) VALUES
('2020001', 'Admin', 'Sistema', 'admin@universidad.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', true, 'Administrador del sistema');

-- Usuarios normales (contraseña: 'password123' en SHA-256)
INSERT INTO usuarios (carnet, nombre, apellido, correo, contrasena, biografia) VALUES
('2020002', 'Juan', 'Pérez', 'juan.perez@universidad.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Estudiante de Ingeniería en Sistemas'),
('2020003', 'María', 'González', 'maria.gonzalez@universidad.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Estudiante de Arquitectura'),
('2020004', 'Carlos', 'Rodríguez', 'carlos.rodriguez@universidad.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Estudiante de Medicina'),
('2020005', 'Ana', 'Martínez', 'ana.martinez@universidad.edu', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Estudiante de Derecho');

-- ========================================
-- 2. PUBLICACIONES DE PRUEBA
-- ========================================

-- Insertar publicaciones
INSERT INTO publicaciones (carnet_usuario, titulo, contenido, etiquetas) VALUES
('2020002', '¡Bienvenidos al nuevo semestre! ¿Listos para este desafío?', 'text', '["Estudios", "Universidad"]'),
('2020003', 'Compartiendo mi proyecto final de diseño arquitectónico', 'text', '["Arquitectura", "Proyectos"]'),
('2020004', 'Consejos para los que están estudiando anatomía', 'text', '["Medicina", "Consejos"]'),
('2020005', 'Resumen de Derecho Constitucional disponible', 'text', '["Derecho", "Apuntes"]'),
('2020002', 'Alguien tiene apuntes de Programación Orientada a Objetos?', 'text', '["Programación", "Ayuda"]');

-- ========================================
-- 3. COMENTARIOS DE PRUEBA
-- ========================================

-- Comentarios en la primera publicación
INSERT INTO comentarios (publicacion_id, usuario_carnet, texto) 
SELECT id, '2020003', '¡Súper emocionada por este semestre!'
FROM publicaciones WHERE carnet_usuario = '2020002' LIMIT 1;

INSERT INTO comentarios (publicacion_id, usuario_carnet, texto) 
SELECT id, '2020004', 'Va a estar retador pero lo lograremos'
FROM publicaciones WHERE carnet_usuario = '2020002' LIMIT 1;

-- ========================================
-- 4. PRODUCTOS DE PRUEBA
-- ========================================

-- Productos de venta
INSERT INTO productos (usuario_carnet, nombre, nombre_vendedor, telefono, categoria, precio, descripcion, foto_url) VALUES
('2020002', 'Calculadora Científica Casio', 'Juan Pérez', '78901234', 'Electrónica', 150.00, 'Calculadora científica en excelente estado, poco uso', '[]'),
('2020003', 'Juego de Escuadras Profesional', 'María González', '78905678', 'Útiles', 80.00, 'Set completo de escuadras para dibujo técnico', '[]'),
('2020004', 'Libros de Anatomía', 'Carlos Rodríguez', '78909012', 'Libros', 200.00, 'Colección de 3 libros de anatomía, edición 2022', '[]'),
('2020005', 'Código Civil Comentado', 'Ana Martínez', '78903456', 'Libros', 180.00, 'Edición 2023, como nuevo', '[]');

-- ========================================
-- 5. LIKES Y INTERACCIONES
-- ========================================

-- Likes en publicaciones
INSERT INTO likes (publicacion_id, usuario_carnet)
SELECT p.id, '2020003'
FROM publicaciones p
WHERE p.carnet_usuario = '2020002'
LIMIT 1;

INSERT INTO likes (publicacion_id, usuario_carnet)
SELECT p.id, '2020004'
FROM publicaciones p
WHERE p.carnet_usuario = '2020002'
LIMIT 1;

INSERT INTO likes (publicacion_id, usuario_carnet)
SELECT p.id, '2020005'
FROM publicaciones p
WHERE p.carnet_usuario = '2020002'
LIMIT 1;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Contar registros insertados
SELECT 
  'Usuarios' as tabla, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'Publicaciones', COUNT(*) FROM publicaciones
UNION ALL
SELECT 'Comentarios', COUNT(*) FROM comentarios
UNION ALL
SELECT 'Productos', COUNT(*) FROM productos
UNION ALL
SELECT 'Likes', COUNT(*) FROM likes;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

-- Contraseña para todos los usuarios de prueba: password123
-- Hash SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

-- Para crear más usuarios con contraseña personalizada:
-- 1. Genera el hash SHA-256 de tu contraseña en: https://emn178.github.io/online-tools/sha256.html
-- 2. Usa el hash generado en el campo 'contrasena'
