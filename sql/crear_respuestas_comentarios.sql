-- Tabla para likes en respuestas a comentarios
CREATE TABLE IF NOT EXISTS likes_respuestas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  respuesta_id UUID NOT NULL REFERENCES respuestas_comentarios(id) ON DELETE CASCADE,
  usuario_carnet VARCHAR(20) NOT NULL REFERENCES usuarios(carnet) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(respuesta_id, usuario_carnet)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_likes_respuestas_respuesta_id ON likes_respuestas(respuesta_id);
CREATE INDEX IF NOT EXISTS idx_likes_respuestas_usuario ON likes_respuestas(usuario_carnet);

-- Habilitar RLS
ALTER TABLE likes_respuestas ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden ver likes
CREATE POLICY "Cualquiera puede ver likes de respuestas"
  ON likes_respuestas
  FOR SELECT
  USING (true);

-- Política: usuarios autenticados pueden dar like
CREATE POLICY "Usuarios autenticados pueden dar like a respuestas"
  ON likes_respuestas
  FOR INSERT
  WITH CHECK (true);

-- Política: solo el autor puede eliminar su like
CREATE POLICY "Usuario puede quitar su like de respuesta"
  ON likes_respuestas
  FOR DELETE
  USING (usuario_carnet = current_setting('request.jwt.claims', true)::json->>'carnet');

-- Comentarios para documentación
COMMENT ON TABLE likes_respuestas IS 'Likes en respuestas a comentarios';
COMMENT ON COLUMN likes_respuestas.respuesta_id IS 'ID de la respuesta que recibe el like';
COMMENT ON COLUMN likes_respuestas.usuario_carnet IS 'Carnet del usuario que da like';

-- ========================================
-- FUNCIÓN Y TRIGGER PARA ACTUALIZAR CONTADOR DE RESPUESTAS
-- ========================================

-- Agregar columna respuestas_count a comentarios si no existe
ALTER TABLE comentarios 
ADD COLUMN IF NOT EXISTS respuestas_count INTEGER DEFAULT 0;

-- Crear índice para el contador
CREATE INDEX IF NOT EXISTS idx_comentarios_respuestas_count ON comentarios(respuestas_count);

-- Función para actualizar el contador de respuestas
CREATE OR REPLACE FUNCTION actualizar_respuestas_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Crear trigger si no existe (DROP primero por si existe sin SECURITY DEFINER)
DROP TRIGGER IF EXISTS trigger_respuestas_comentario ON respuestas_comentarios;

CREATE TRIGGER trigger_respuestas_comentario
  AFTER INSERT OR DELETE ON respuestas_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_respuestas_comentario();

-- Recalcular contadores existentes (ejecutar una sola vez)
UPDATE comentarios c
SET respuestas_count = (
  SELECT COUNT(*)
  FROM respuestas_comentarios r
  WHERE r.comentario_id = c.id
);

COMMENT ON COLUMN comentarios.respuestas_count IS 'Contador de respuestas del comentario (actualizado por trigger)';

