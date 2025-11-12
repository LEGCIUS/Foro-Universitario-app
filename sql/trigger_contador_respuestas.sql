-- ========================================
-- TRIGGER PARA ACTUALIZAR CONTADOR DE RESPUESTAS EN COMENTARIOS
-- ========================================

-- 1. Agregar columna respuestas_count a comentarios si no existe
ALTER TABLE comentarios 
ADD COLUMN IF NOT EXISTS respuestas_count INTEGER DEFAULT 0;

-- 2. Crear índice para el contador
CREATE INDEX IF NOT EXISTS idx_comentarios_respuestas_count ON comentarios(respuestas_count);

-- 3. Crear la función trigger
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

-- 4. Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_respuestas_comentario ON respuestas_comentarios;

-- 5. Crear el trigger
CREATE TRIGGER trigger_respuestas_comentario
AFTER INSERT OR DELETE ON respuestas_comentarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_respuestas_comentario();

-- 6. Recalcular contadores existentes para sincronizar
UPDATE comentarios c
SET respuestas_count = (
  SELECT COUNT(*)
  FROM respuestas_comentarios r
  WHERE r.comentario_id = c.id
);

-- 7. Agregar comentario a la columna
COMMENT ON COLUMN comentarios.respuestas_count IS 'Contador de respuestas del comentario (actualizado automáticamente por trigger)';
