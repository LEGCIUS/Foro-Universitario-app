-- RPC: admin_delete_publication
-- Elimina una publicación por id con privilegios elevados si el solicitante es admin
-- Requiere: RLS puede permanecer activo en publicaciones; esta función actúa como SECURITY DEFINER

create or replace function public.admin_delete_publication(
  pub_id uuid,
  admin_carnet text
) returns void
language plpgsql
security definer
as $$
begin
  -- Verificar admin en tabla usuarios
  if not exists (
    select 1 from public.usuarios u
    where u.carnet = admin_carnet
      and (u.is_admin = true or lower(coalesce(u.rol, '')) in ('admin','administrador'))
  ) then
    raise exception 'No autorizado';
  end if;

  -- Eliminar la publicación
  delete from public.publicaciones where id = pub_id;

  -- Nota: eliminación de objetos en Storage debe manejarse desde el cliente o una Edge Function.
end;
$$;

comment on function public.admin_delete_publication is 'Elimina publicaciones por id validando que el solicitante sea admin';
