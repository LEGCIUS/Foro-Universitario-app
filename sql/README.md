# Scripts SQL - Foro Universitario App

Este directorio contiene scripts SQL **legado** usados originalmente para configurar la base de datos del proyecto.

> Nota: La app ya no depende de un BaaS desde el frontend. Si usas estos scripts, aplícalos en tu motor de base de datos (por ejemplo, PostgreSQL) como parte del backend.

## 📋 Archivos

### 1. `schema_completo.sql` ⭐
**Script principal** que crea toda la estructura de la base de datos desde cero.

**Incluye:**
- ✅ 13 tablas principales
- ✅ Índices optimizados
- ✅ Triggers automáticos
- ✅ Funciones de base de datos
- ✅ Row Level Security (RLS)
- ✅ Políticas de seguridad
- ✅ Recálculo de contadores

**Tablas creadas:**
1. `usuarios` - Información de usuarios
2. `publicaciones` - Posts del foro
3. `likes` - Likes en publicaciones
4. `comentarios` - Comentarios en publicaciones
5. `likes_comentarios` - Likes en comentarios
6. `respuestas_comentarios` - Respuestas a comentarios
7. `likes_respuestas` - Likes en respuestas
8. `productos` - Productos en venta
9. `reportes_publicaciones` - Reportes de contenido
10. `reportes_ventas` - Reportes de productos
11. `notificaciones` - Sistema de notificaciones
12. `auditoria_eliminaciones` - Registro de auditoría

### 2. `datos_prueba.sql`
Script con datos de ejemplo para testing y desarrollo.

**Incluye:**
- 5 usuarios de prueba (1 admin + 4 usuarios normales)
- Publicaciones de ejemplo
- Comentarios de prueba
- Productos de ejemplo
- Interacciones (likes)

**Credenciales de prueba:**
- **Usuario admin:** `2020001` / Contraseña: `password123`
- **Usuarios normales:** `2020002` - `2020005` / Contraseña: `password123`

### 3. Scripts auxiliares (históricos)
- `agregar_campos_perfil.sql` - Migración para campos de perfil
- `crear_respuestas_comentarios.sql` - Migración para sistema de respuestas
- `trigger_contador_respuestas.sql` - Trigger para contador de respuestas

> **Nota:** Los scripts auxiliares están integrados en `schema_completo.sql`

## 🚀 Cómo usar

### Instalación inicial completa

1. **Abrir tu herramienta SQL**
   - Usa el cliente SQL de tu preferencia (por ejemplo, psql o una GUI)

2. **Ejecutar schema completo**
   ```sql
   -- Copiar y pegar el contenido de schema_completo.sql
   -- Ejecutar el script completo
   ```

3. **Archivos/Storage**
   - El manejo de archivos (perfil, multimedia, productos) se realiza desde el backend. Configura el storage correspondiente en tu infraestructura.

4. **[Opcional] Insertar datos de prueba**
   ```sql
   -- Copiar y pegar el contenido de datos_prueba.sql
   -- Ejecutar después del schema
   ```

## 🔧 Configuración de Storage (referencia)

Las reglas/políticas de acceso a archivos dependen de tu backend y proveedor de storage.

## 📊 Características de la base de datos

### Contadores Automáticos
El schema incluye triggers que actualizan automáticamente:
- ✅ Contador de likes en publicaciones
- ✅ Contador de comentarios en publicaciones
- ✅ Contador de respuestas en comentarios
- ✅ Contador de likes en comentarios
- ✅ Contador de likes en respuestas

### Seguridad (RLS)
Todas las tablas tienen Row Level Security habilitado con políticas que:
- ✅ Permiten lectura pública
- ✅ Restringen escritura a usuarios autenticados
- ✅ Permiten modificación solo al propietario
- ✅ Protegen funciones administrativas

### Auditoría
Sistema de auditoría que registra:
- ✅ Eliminaciones de contenido por administradores
- ✅ Motivos y detalles de eliminación
- ✅ Trazabilidad completa

## 🔄 Migraciones

Si necesitas actualizar la base de datos existente:

### Método 1: Recrear desde cero (⚠️ ELIMINA DATOS)
```sql
-- 1. Eliminar todas las tablas
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 2. Restaurar permisos
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 3. Ejecutar schema_completo.sql
```

### Método 2: Migración incremental
Usar los scripts auxiliares individuales según sea necesario.

## 📝 Verificación

Después de ejecutar el schema, verificar con:

```sql
-- Listar todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🆘 Troubleshooting

### Error: "relation already exists"
- La tabla ya existe. Usar `DROP TABLE IF EXISTS` antes o usar script de migración.

### Error: "permission denied"
- Verificar que tienes permisos suficientes en tu motor de base de datos.

### Los contadores no se actualizan
- Verificar que los triggers estén creados: ejecutar la sección de triggers nuevamente.
- Ejecutar la sección 17 del schema para recalcular contadores.

### Problemas con RLS
- Verificar que las políticas estén activas.
- Revisar que el JWT incluya el campo `carnet`.

## 📧 Soporte

Para problemas o dudas sobre la base de datos, revisar:
1. Logs del backend / base de datos
2. Consola del navegador en la app
3. Documentación de PostgreSQL: https://www.postgresql.org/docs/

## 🔐 Seguridad

**IMPORTANTE:** 
- ⚠️ Nunca commitear datos de producción
- ⚠️ Las credenciales en `datos_prueba.sql` son SOLO para testing
- ⚠️ Cambiar contraseñas de admin en producción
- ⚠️ Revisar políticas RLS antes de producción

## 📅 Última actualización

Script generado: Diciembre 2024
PostgreSQL: 14+

