-- =====================================================
-- SQL para tablas opcionales de auditoría y notificaciones
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- =====================================================

-- 1) Tabla de auditoría de eliminaciones (registro interno)
create table if not exists public.auditoria_eliminaciones (
  id bigint generated always as identity primary key,
  publicacion_id uuid not null,
  carnet_admin text,
  carnet_usuario text,
  motivo text not null,
  detalle text not null,
  base_reglamentaria text,
  enlace text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_audit_pub on public.auditoria_eliminaciones(publicacion_id);
create index if not exists idx_audit_admin on public.auditoria_eliminaciones(carnet_admin);
create index if not exists idx_audit_usuario on public.auditoria_eliminaciones(carnet_usuario);

comment on table public.auditoria_eliminaciones is 'Registro de publicaciones eliminadas por administradores';

-- 2) Tabla de notificaciones en la app (avisos al usuario)
create table if not exists public.notificaciones (
  id bigint generated always as identity primary key,
  carnet text not null,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  data jsonb,
  leido boolean not null default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone
);

create index if not exists idx_notif_carnet_leido_created 
on public.notificaciones(carnet, leido, created_at desc);

create index if not exists idx_notif_tipo on public.notificaciones(tipo);

create index if not exists idx_notif_expires on public.notificaciones(expires_at)
where expires_at is not null;

comment on table public.notificaciones is 'Notificaciones en la app para los usuarios';

-- 3) Función RPC para enviar correos (stub - reemplaza con implementación real)
create or replace function public.send_publication_deletion_email(
  to_email text,
  subject text,
  motivo text,
  detalle text,
  base_reglamentaria text,
  enlace text,
  titulo_publicacion text
) returns void
language plpgsql
security definer
as $$
begin
  -- IMPLEMENTACIÓN PENDIENTE:
  -- Opción A: Llamar a una Edge Function via HTTP
  -- Opción B: Usar extensión http para webhook externo (SendGrid/Resend/etc.)
  -- Opción C: Trigger que inserta en tabla de cola procesada por servicio externo
  
  -- Por ahora es un no-op para evitar errores 404
  -- Descomenta y adapta cuando estés listo:
  
  /*
  -- Ejemplo con extensión http (requiere: create extension if not exists http;)
  perform extensions.http_post(
    'https://tu-webhook-o-edge-function/send-email',
    json_build_object(
      'to', to_email,
      'subject', subject,
      'motivo', motivo,
      'detalle', detalle,
      'base_reglamentaria', base_reglamentaria,
      'enlace', enlace,
      'titulo_publicacion', titulo_publicacion
    )::text,
    'content-type=application/json'
  );
  */
  
  raise notice 'Email stub: would send to % with subject "%"', to_email, subject;
end;
$$;

comment on function public.send_publication_deletion_email is 'Envía correo de notificación al usuario (stub - implementar con webhook o Edge Function)';

-- =====================================================
-- Opcional: Políticas RLS si usas Supabase Auth
-- =====================================================

-- Habilitar RLS en notificaciones (solo si usas Auth JWT)
-- alter table public.notificaciones enable row level security;

-- Permitir a cada usuario ver solo sus propias notificaciones
-- create policy "Users can view own notifications"
-- on public.notificaciones for select
-- using (carnet = (select carnet from public.usuarios where auth.uid() = id));

-- Permitir actualizar (marcar como leído) solo propias notificaciones
-- create policy "Users can update own notifications"
-- on public.notificaciones for update
-- using (carnet = (select carnet from public.usuarios where auth.uid() = id));

-- Permitir a admins insertar notificaciones para cualquier usuario
-- create policy "Admins can insert notifications"
-- on public.notificaciones for insert
-- with check (
--   exists (
--     select 1 from public.usuarios
--     where auth.uid() = id and (rol = 'admin' or is_admin = true)
--   )
-- );

-- =====================================================
-- Limpieza automática (opcional)
-- =====================================================

-- Función para limpiar notificaciones expiradas o muy antiguas
create or replace function public.cleanup_old_notifications()
returns void
language plpgsql
security definer
as $$
begin
  -- Eliminar notificaciones leídas con más de 90 días
  delete from public.notificaciones
  where leido = true
    and created_at < now() - interval '90 days';

  -- Eliminar notificaciones expiradas
  delete from public.notificaciones
  where expires_at is not null
    and expires_at < now();
end;
$$;

-- Puedes programar esta función en un cron job de Supabase o llamarla manualmente
-- En el dashboard de Supabase: Database > Cron Jobs > Create a new cron job
-- Schedule: 0 2 * * * (diariamente a las 2 AM)
-- Command: select public.cleanup_old_notifications();
