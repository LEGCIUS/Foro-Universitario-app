-- Agregar campos nuevos a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS gustos TEXT,
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Comentarios para documentación
COMMENT ON COLUMN usuarios.gustos IS 'Gustos e intereses del usuario';
COMMENT ON COLUMN usuarios.fecha_nacimiento IS 'Fecha de nacimiento del usuario';
