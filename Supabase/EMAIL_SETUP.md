# Guía de configuración de envío de correos

## Opción recomendada: Edge Function + Resend

### 1. Crear cuenta en Resend

1. Ve a https://resend.com y crea una cuenta gratuita (3000 correos/mes)
2. Verifica tu dominio o usa el sandbox (solo para pruebas, emails llegan a tu correo verificado)
3. Genera una API Key en el dashboard

### 2. Configurar el secret en Supabase

```bash
# Instala Supabase CLI si aún no lo tienes
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref ilgimatolextscahokhm

# Configura el secret
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
```

### 3. Deploy de la Edge Function

```bash
# Desde la raíz de tu proyecto
cd Supabase

# Deploy
supabase functions deploy send-deletion-email --no-verify-jwt
```

### 4. Habilitar extensión HTTP en Supabase (para la RPC)

En el SQL Editor de tu proyecto Supabase:

```sql
create extension if not exists http with schema extensions;
```

### 5. Actualizar la RPC

Ejecuta el SQL en `Supabase/rpc_send_email.sql` (ya está listo con tu project ref)

### 6. Actualizar el from address

En `Supabase/functions/send-deletion-email/index.ts` línea 87:

```typescript
from: 'Foro Universitario <noreply@tudominio.com>',
```

- **Sandbox**: usa `onboarding@resend.dev` (solo para testing)
- **Producción**: verifica tu dominio en Resend y usa `noreply@tudominio.com`

## Alternativa rápida sin Edge Function: HTTP directo desde RPC

Si no quieres usar Edge Functions, puedes llamar a Resend directamente desde la RPC:

```sql
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
  html_body text;
  api_key text := 're_TU_API_KEY_AQUI'; -- NUNCA en producción, usa Vault
begin
  html_body := format(
    '<h1>Tu publicación fue eliminada</h1><p><strong>Motivo:</strong> %s</p><p>%s</p>',
    motivo, detalle
  );

  perform extensions.http_post(
    'https://api.resend.com/emails',
    json_build_object(
      'from', 'Foro Universitario <onboarding@resend.dev>',
      'to', array[to_email],
      'subject', subject,
      'html', html_body
    )::text,
    format('content-type=application/json', ''),
    format('Authorization=Bearer %s', api_key)
  );
exception
  when others then
    raise notice 'Error enviando correo: %', sqlerrm;
end;
$$;
```

⚠️ **Advertencia**: Nunca pongas API keys en el código SQL en producción. Usa Supabase Vault:

```sql
select vault.create_secret('RESEND_API_KEY', 're_tu_key');
-- Luego: api_key := vault.decrypt_secret('RESEND_API_KEY');
```

## Probar que funciona

Después de configurar, desde AdminScreen al eliminar una publicación debería:

1. ✅ Eliminar archivo del Storage
2. ✅ Eliminar fila de publicaciones
3. ✅ Insertar en auditoria_eliminaciones
4. ✅ Insertar en notificaciones
5. ✅ Enviar correo al usuario

Revisa los logs de la Edge Function:

```bash
supabase functions logs send-deletion-email
```

## Troubleshooting

**Error 404 al llamar la RPC**: Ejecuta `Supabase/rpc_send_email.sql` en el SQL Editor

**Correo no llega**:

- Verifica que RESEND_API_KEY esté configurado: `supabase secrets list`
- Revisa logs: `supabase functions logs send-deletion-email --tail`
- En sandbox, el correo solo llega al email verificado en Resend

**Extensión http no existe**:

```sql
create extension if not exists http with schema extensions;
```
