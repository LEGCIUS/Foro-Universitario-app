-- ========================================
-- SCRIPT COMPLETO DE BASE DE DATOS
-- Foro Universitario App - Supabase
-- ========================================
-- Este script crea todas las tablas necesarias para la aplicación
-- Ejecutar en orden para mantener las dependencias correctas

-- ========================================
-- 1. EXTENSIONES NECESARIAS
-- ========================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. TABLA USUARIOS
-- ========================================

CREATE TABLE IF NOT EXISTS usuarios (
  carnet VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  biografia TEXT,
  foto_perfil TEXT,
  gustos TEXT,
  fecha_nacimiento DATE,
  es_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre, apellido);

-- Comentarios
COMMENT ON TABLE usuarios IS 'Información de los usuarios del foro universitario';
COMMENT ON COLUMN usuarios.carnet IS 'Carnet universitario único del usuario';
COMMENT ON COLUMN usuarios.gustos IS 'Gustos e intereses del usuario';
COMMENT ON COLUMN usuarios.fecha_nacimiento IS 'Fecha de nacimiento del usuario';

-- ========================================
-- 3. TABLA PUBLICACIONES
-- ========================================

CREATE TABLE IF NOT EXISTS publicaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carnet_usuario VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  archivo_url TEXT,
  contenido VARCHAR(20) DEFAULT 'text',
  etiquetas JSONB DEFAULT '[]',
  fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0,
  comentarios_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para publicaciones
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario ON publicaciones(carnet_usuario);
CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha ON publicaciones(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_etiquetas ON publicaciones USING GIN(etiquetas);

-- Comentarios
COMMENT ON TABLE publicaciones IS 'Publicaciones creadas por los usuarios';
COMMENT ON COLUMN publicaciones.contenido IS 'Tipo de contenido: text, image, video';
COMMENT ON COLUMN publicaciones.etiquetas IS 'Array JSON de etiquetas asociadas';

-- ========================================
-- 4. TABLA LIKES
-- ========================================

CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publicacion_id UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(publicacion_id, usuario_carnet)
);

-- Índices para likes
CREATE INDEX IF NOT EXISTS idx_likes_publicacion ON likes(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_likes_usuario ON likes(usuario_carnet);

-- Comentarios
COMMENT ON TABLE likes IS 'Likes dados por usuarios a publicaciones';

-- ========================================
-- 5. TABLA COMENTARIOS
-- ========================================

CREATE TABLE IF NOT EXISTS comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publicacion_id UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  respuestas_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para comentarios
CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion ON comentarios(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario ON comentarios(usuario_carnet);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha ON comentarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_respuestas_count ON comentarios(respuestas_count);

-- Comentarios
COMMENT ON TABLE comentarios IS 'Comentarios en publicaciones';
COMMENT ON COLUMN comentarios.respuestas_count IS 'Contador de respuestas al comentario';

-- ========================================
-- 6. TABLA LIKES_COMENTARIOS
-- ========================================

CREATE TABLE IF NOT EXISTS likes_comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comentario_id, usuario_carnet)
);

-- Índices para likes_comentarios
CREATE INDEX IF NOT EXISTS idx_likes_comentarios_comentario ON likes_comentarios(comentario_id);
CREATE INDEX IF NOT EXISTS idx_likes_comentarios_usuario ON likes_comentarios(usuario_carnet);

-- Comentarios
COMMENT ON TABLE likes_comentarios IS 'Likes dados a comentarios';

-- ========================================
-- 7. TABLA RESPUESTAS_COMENTARIOS
-- ========================================

CREATE TABLE IF NOT EXISTS respuestas_comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para respuestas_comentarios
CREATE INDEX IF NOT EXISTS idx_respuestas_comentarios_comentario ON respuestas_comentarios(comentario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_comentarios_usuario ON respuestas_comentarios(usuario_carnet);
CREATE INDEX IF NOT EXISTS idx_respuestas_comentarios_fecha ON respuestas_comentarios(created_at DESC);

-- Comentarios
COMMENT ON TABLE respuestas_comentarios IS 'Respuestas a comentarios';

-- ========================================
-- 8. TABLA LIKES_RESPUESTAS
-- ========================================

CREATE TABLE IF NOT EXISTS likes_respuestas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  respuesta_id UUID NOT NULL REFERENCES respuestas_comentarios(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(respuesta_id, usuario_carnet)
);

-- Índices para likes_respuestas
CREATE INDEX IF NOT EXISTS idx_likes_respuestas_respuesta_id ON likes_respuestas(respuesta_id);
CREATE INDEX IF NOT EXISTS idx_likes_respuestas_usuario ON likes_respuestas(usuario_carnet);

-- Comentarios
COMMENT ON TABLE likes_respuestas IS 'Likes en respuestas a comentarios';
COMMENT ON COLUMN likes_respuestas.respuesta_id IS 'ID de la respuesta que recibe el like';
COMMENT ON COLUMN likes_respuestas.usuario_carnet IS 'Carnet del usuario que da like';

-- ========================================
-- 9. TABLA PRODUCTOS
-- ========================================

CREATE TABLE IF NOT EXISTS productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  nombre_vendedor VARCHAR(255),
  telefono VARCHAR(20),
  mensaje_whatsapp TEXT,
  categoria VARCHAR(100),
  precio DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  foto_url JSONB DEFAULT '[]',
  hora_inicio_venta TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_usuario ON productos(usuario_carnet);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_precio ON productos(precio);
CREATE INDEX IF NOT EXISTS idx_productos_fecha ON productos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);

-- Comentarios
COMMENT ON TABLE productos IS 'Productos publicados para venta por usuarios';
COMMENT ON COLUMN productos.foto_url IS 'Array JSON de URLs de fotos del producto';

-- ========================================
-- 10. TABLA REPORTES_PUBLICACIONES
-- ========================================

CREATE TABLE IF NOT EXISTS reportes_publicaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publicacion_id UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  reportado_por VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  motivo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(20) REFERENCES usuarios(carnet)
);

-- Índices para reportes_publicaciones
CREATE INDEX IF NOT EXISTS idx_reportes_publicaciones_estado ON reportes_publicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_publicaciones_fecha ON reportes_publicaciones(created_at DESC);

-- Comentarios
COMMENT ON TABLE reportes_publicaciones IS 'Reportes de publicaciones inapropiadas';

-- ========================================
-- 11. TABLA REPORTES_VENTAS
-- ========================================

CREATE TABLE IF NOT EXISTS reportes_ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  reportado_por VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  motivo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(20) REFERENCES usuarios(carnet)
);

-- Índices para reportes_ventas
CREATE INDEX IF NOT EXISTS idx_reportes_ventas_estado ON reportes_ventas(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_ventas_fecha ON reportes_ventas(created_at DESC);

-- Comentarios
COMMENT ON TABLE reportes_ventas IS 'Reportes de productos inapropiados';

-- ========================================
-- 12. TABLA NOTIFICACIONES
-- ========================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_carnet ON notificaciones(carnet);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- Comentarios
COMMENT ON TABLE notificaciones IS 'Notificaciones para usuarios';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: like, comentario, respuesta, producto_eliminado, publicacion_eliminada, etc.';
COMMENT ON COLUMN notificaciones.data IS 'Datos adicionales en formato JSON';

-- ========================================
-- 13. TABLA AUDITORIA_ELIMINACIONES
-- ========================================

CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_contenido VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  carnet_usuario VARCHAR(20) REFERENCES usuarios(carnet),
  admin_carnet VARCHAR(20) REFERENCES usuarios(carnet),
  motivo VARCHAR(255) NOT NULL,
  detalle TEXT,
  base_reglamentaria TEXT,
  enlace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para auditoria_eliminaciones
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo ON auditoria_eliminaciones(tipo_contenido);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_eliminaciones(carnet_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_admin ON auditoria_eliminaciones(admin_carnet);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_eliminaciones(created_at DESC);

-- Comentarios
COMMENT ON TABLE auditoria_eliminaciones IS 'Registro de auditoría de contenido eliminado por administradores';

-- ========================================
-- 14. TRIGGERS Y FUNCIONES
-- ========================================

-- Función para actualizar contador de respuestas en comentarios
CREATE OR REPLACE FUNCTION actualizar_respuestas_comentario()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar el contador cuando se agrega una respuesta
    UPDATE comentarios
    SET respuestas_count = respuestas_count + 1
    WHERE id = NEW.comentario_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar el contador cuando se elimina una respuesta
    UPDATE comentarios
    SET respuestas_count = GREATEST(0, respuestas_count - 1)
    WHERE id = OLD.comentario_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para respuestas_comentarios
DROP TRIGGER IF EXISTS trigger_respuestas_comentario ON respuestas_comentarios;
CREATE TRIGGER trigger_respuestas_comentario
AFTER INSERT OR DELETE ON respuestas_comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_respuestas_comentario();

-- Función para actualizar contador de likes en publicaciones
CREATE OR REPLACE FUNCTION actualizar_likes_publicacion()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE publicaciones
    SET likes_count = likes_count + 1
    WHERE id = NEW.publicacion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE publicaciones
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.publicacion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para likes en publicaciones
DROP TRIGGER IF EXISTS trigger_likes_publicacion ON likes;
CREATE TRIGGER trigger_likes_publicacion
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION actualizar_likes_publicacion();

-- Función para actualizar contador de comentarios en publicaciones
CREATE OR REPLACE FUNCTION actualizar_comentarios_publicacion()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE publicaciones
    SET comentarios_count = comentarios_count + 1
    WHERE id = NEW.publicacion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE publicaciones
    SET comentarios_count = GREATEST(0, comentarios_count - 1)
    WHERE id = OLD.publicacion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para comentarios en publicaciones
DROP TRIGGER IF EXISTS trigger_comentarios_publicacion ON comentarios;
CREATE TRIGGER trigger_comentarios_publicacion
AFTER INSERT OR DELETE ON comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_comentarios_publicacion();

-- Función para actualizar contador de likes en comentarios
CREATE OR REPLACE FUNCTION actualizar_likes_comentario()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comentarios
    SET likes_count = likes_count + 1
    WHERE id = NEW.comentario_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comentarios
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comentario_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para likes en comentarios
DROP TRIGGER IF EXISTS trigger_likes_comentario ON likes_comentarios;
CREATE TRIGGER trigger_likes_comentario
AFTER INSERT OR DELETE ON likes_comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_likes_comentario();

-- Función para actualizar contador de likes en respuestas
CREATE OR REPLACE FUNCTION actualizar_likes_respuesta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE respuestas_comentarios
    SET likes_count = likes_count + 1
    WHERE id = NEW.respuesta_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE respuestas_comentarios
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.respuesta_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para likes en respuestas
DROP TRIGGER IF EXISTS trigger_likes_respuesta ON likes_respuestas;
CREATE TRIGGER trigger_likes_respuesta
AFTER INSERT OR DELETE ON likes_respuestas
FOR EACH ROW
EXECUTE FUNCTION actualizar_likes_respuesta();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_usuarios_updated_at ON usuarios;
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_publicaciones_updated_at ON publicaciones;
CREATE TRIGGER trigger_publicaciones_updated_at
BEFORE UPDATE ON publicaciones
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_comentarios_updated_at ON comentarios;
CREATE TRIGGER trigger_comentarios_updated_at
BEFORE UPDATE ON comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_respuestas_updated_at ON respuestas_comentarios;
CREATE TRIGGER trigger_respuestas_updated_at
BEFORE UPDATE ON respuestas_comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_productos_updated_at ON productos;
CREATE TRIGGER trigger_productos_updated_at
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

-- ========================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_eliminaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS
DROP POLICY IF EXISTS "Cualquiera puede ver usuarios" ON usuarios;
CREATE POLICY "Cualquiera puede ver usuarios"
  ON usuarios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON usuarios;
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON usuarios FOR UPDATE
  USING (carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para PUBLICACIONES
DROP POLICY IF EXISTS "Cualquiera puede ver publicaciones" ON publicaciones;
CREATE POLICY "Cualquiera puede ver publicaciones"
  ON publicaciones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear publicaciones" ON publicaciones;
CREATE POLICY "Usuarios autenticados pueden crear publicaciones"
  ON publicaciones FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede editar sus publicaciones" ON publicaciones;
CREATE POLICY "Usuario puede editar sus publicaciones"
  ON publicaciones FOR UPDATE
  USING (carnet_usuario = current_setting('request.jwt.claims', true)::json->>'carnet');

DROP POLICY IF EXISTS "Usuario puede eliminar sus publicaciones" ON publicaciones;
CREATE POLICY "Usuario puede eliminar sus publicaciones"
  ON publicaciones FOR DELETE
  USING (carnet_usuario = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para LIKES
DROP POLICY IF EXISTS "Cualquiera puede ver likes" ON likes;
CREATE POLICY "Cualquiera puede ver likes"
  ON likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden dar like" ON likes;
CREATE POLICY "Usuarios autenticados pueden dar like"
  ON likes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede quitar su like" ON likes;
CREATE POLICY "Usuario puede quitar su like"
  ON likes FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para COMENTARIOS
DROP POLICY IF EXISTS "Cualquiera puede ver comentarios" ON comentarios;
CREATE POLICY "Cualquiera puede ver comentarios"
  ON comentarios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden comentar" ON comentarios;
CREATE POLICY "Usuarios autenticados pueden comentar"
  ON comentarios FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede editar sus comentarios" ON comentarios;
CREATE POLICY "Usuario puede editar sus comentarios"
  ON comentarios FOR UPDATE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

DROP POLICY IF EXISTS "Usuario puede eliminar sus comentarios" ON comentarios;
CREATE POLICY "Usuario puede eliminar sus comentarios"
  ON comentarios FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para LIKES_COMENTARIOS
DROP POLICY IF EXISTS "Cualquiera puede ver likes de comentarios" ON likes_comentarios;
CREATE POLICY "Cualquiera puede ver likes de comentarios"
  ON likes_comentarios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden dar like a comentarios" ON likes_comentarios;
CREATE POLICY "Usuarios autenticados pueden dar like a comentarios"
  ON likes_comentarios FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede quitar su like de comentario" ON likes_comentarios;
CREATE POLICY "Usuario puede quitar su like de comentario"
  ON likes_comentarios FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para RESPUESTAS_COMENTARIOS
DROP POLICY IF EXISTS "Cualquiera puede ver respuestas" ON respuestas_comentarios;
CREATE POLICY "Cualquiera puede ver respuestas"
  ON respuestas_comentarios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden responder" ON respuestas_comentarios;
CREATE POLICY "Usuarios autenticados pueden responder"
  ON respuestas_comentarios FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede editar sus respuestas" ON respuestas_comentarios;
CREATE POLICY "Usuario puede editar sus respuestas"
  ON respuestas_comentarios FOR UPDATE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

DROP POLICY IF EXISTS "Usuario puede eliminar sus respuestas" ON respuestas_comentarios;
CREATE POLICY "Usuario puede eliminar sus respuestas"
  ON respuestas_comentarios FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para LIKES_RESPUESTAS
DROP POLICY IF EXISTS "Cualquiera puede ver likes de respuestas" ON likes_respuestas;
CREATE POLICY "Cualquiera puede ver likes de respuestas"
  ON likes_respuestas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden dar like a respuestas" ON likes_respuestas;
CREATE POLICY "Usuarios autenticados pueden dar like a respuestas"
  ON likes_respuestas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede quitar su like de respuesta" ON likes_respuestas;
CREATE POLICY "Usuario puede quitar su like de respuesta"
  ON likes_respuestas FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para PRODUCTOS
DROP POLICY IF EXISTS "Cualquiera puede ver productos" ON productos;
CREATE POLICY "Cualquiera puede ver productos"
  ON productos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear productos" ON productos;
CREATE POLICY "Usuarios autenticados pueden crear productos"
  ON productos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede editar sus productos" ON productos;
CREATE POLICY "Usuario puede editar sus productos"
  ON productos FOR UPDATE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

DROP POLICY IF EXISTS "Usuario puede eliminar sus productos" ON productos;
CREATE POLICY "Usuario puede eliminar sus productos"
  ON productos FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para REPORTES_PUBLICACIONES
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear reportes de publicaciones" ON reportes_publicaciones;
CREATE POLICY "Usuarios autenticados pueden crear reportes de publicaciones"
  ON reportes_publicaciones FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Solo admins pueden ver reportes de publicaciones" ON reportes_publicaciones;
CREATE POLICY "Solo admins pueden ver reportes de publicaciones"
  ON reportes_publicaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE carnet = current_setting('request.jwt.claims', true)::json->>'carnet' 
      AND es_admin = true
    )
  );

-- Políticas para REPORTES_VENTAS
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear reportes de ventas" ON reportes_ventas;
CREATE POLICY "Usuarios autenticados pueden crear reportes de ventas"
  ON reportes_ventas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Solo admins pueden ver reportes de ventas" ON reportes_ventas;
CREATE POLICY "Solo admins pueden ver reportes de ventas"
  ON reportes_ventas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE carnet = current_setting('request.jwt.claims', true)::json->>'carnet' 
      AND es_admin = true
    )
  );

-- Políticas para NOTIFICACIONES
DROP POLICY IF EXISTS "Usuario puede ver sus notificaciones" ON notificaciones;
CREATE POLICY "Usuario puede ver sus notificaciones"
  ON notificaciones FOR SELECT
  USING (carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

DROP POLICY IF EXISTS "Sistema puede crear notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede crear notificaciones"
  ON notificaciones FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario puede actualizar sus notificaciones" ON notificaciones;
CREATE POLICY "Usuario puede actualizar sus notificaciones"
  ON notificaciones FOR UPDATE
  USING (carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Políticas para AUDITORIA_ELIMINACIONES
DROP POLICY IF EXISTS "Solo admins pueden ver auditoría" ON auditoria_eliminaciones;
CREATE POLICY "Solo admins pueden ver auditoría"
  ON auditoria_eliminaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE carnet = current_setting('request.jwt.claims', true)::json->>'carnet' 
      AND es_admin = true
    )
  );

DROP POLICY IF EXISTS "Sistema puede crear registros de auditoría" ON auditoria_eliminaciones;
CREATE POLICY "Sistema puede crear registros de auditoría"
  ON auditoria_eliminaciones FOR INSERT
  WITH CHECK (true);

-- ========================================
-- 16. STORAGE BUCKETS (Configuración manual en Supabase)
-- ========================================

-- NOTA: Los buckets de storage deben crearse manualmente en Supabase:
-- 1. fotos-perfil (público)
-- 2. multimedia (público) 
-- 3. fotos-productos (público)

-- Políticas de storage se configuran en la interfaz de Supabase

-- ========================================
-- 17. RECALCULAR CONTADORES EXISTENTES
-- ========================================

-- Sincronizar contadores de respuestas en comentarios
UPDATE comentarios c
SET respuestas_count = (
  SELECT COUNT(*)
  FROM respuestas_comentarios r
  WHERE r.comentario_id = c.id
);

-- Sincronizar contadores de likes en publicaciones
UPDATE publicaciones p
SET likes_count = (
  SELECT COUNT(*)
  FROM likes l
  WHERE l.publicacion_id = p.id
);

-- Sincronizar contadores de comentarios en publicaciones
UPDATE publicaciones p
SET comentarios_count = (
  SELECT COUNT(*)
  FROM comentarios c
  WHERE c.publicacion_id = p.id
);

-- Sincronizar contadores de likes en comentarios
UPDATE comentarios c
SET likes_count = (
  SELECT COUNT(*)
  FROM likes_comentarios lc
  WHERE lc.comentario_id = c.id
);

-- Sincronizar contadores de likes en respuestas
UPDATE respuestas_comentarios r
SET likes_count = (
  SELECT COUNT(*)
  FROM likes_respuestas lr
  WHERE lr.respuesta_id = r.id
);

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

-- Verificación de tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
