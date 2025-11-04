-- Reemplaza la RPC stub con una que llame a la Edge Function
-- Ejecuta esto en el SQL Editor de Supabase

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
declare
  function_url text;
  payload jsonb;
begin
  -- URL de tu Edge Function (reemplaza con tu project ref)
  function_url := 'https://ilgimatolextscahokhm.supabase.co/functions/v1/send-deletion-email';
  
  payload := jsonb_build_object(
    'to_email', to_email,
    'subject', subject,
    'motivo', motivo,
    'detalle', detalle,
    'base_reglamentaria', base_reglamentaria,
    'enlace', enlace,
    'titulo_publicacion', titulo_publicacion
  );
  
  -- Llamar a la Edge Function via extensión http
  -- Requiere: create extension if not exists http with schema extensions;
  perform extensions.http_post(
    function_url,
    payload::text,
    'content-type=application/json'
  );
  
exception
  when others then
    -- Silenciar errores para no bloquear la eliminación
    raise notice 'Error al enviar correo: %', sqlerrm;
end;
$$;

comment on function public.send_publication_deletion_email is 'Envía correo vía Edge Function send-deletion-email';
