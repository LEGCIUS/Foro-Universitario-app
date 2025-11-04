// Edge Function para enviar correos de eliminación de publicaciones
// Deploy: supabase functions deploy send-deletion-email --no-verify-jwt
// Requiere secret RESEND_API_KEY configurado en Supabase

// @ts-ignore: Import de Deno resuelto en runtime por Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Declaración mínima para que el editor TypeScript no marque error; en Deno existe globalmente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Foro Universitario <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to_email: string
  subject: string
  motivo: string
  detalle: string
  base_reglamentaria?: string | null
  enlace?: string | null
  titulo_publicacion?: string
}

serve(async (req) => {
  // Manejo CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Falta RESEND_API_KEY en variables de entorno' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { to_email, subject, motivo, detalle, base_reglamentaria, enlace, titulo_publicacion }: EmailRequest = await req.json()

    if (!to_email || !motivo || !detalle) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios: to_email, motivo, detalle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir HTML del correo
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .label { font-weight: 700; color: #111; margin-top: 16px; }
    .value { margin-top: 4px; padding: 12px; background: white; border-left: 4px solid #DC2626; border-radius: 4px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    a { color: #2563EB; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Foro Universitario</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">Notificación de moderación</p>
  </div>
  <div class="content">
    <p>Hola,</p>
    <p>Te informamos que una de tus publicaciones fue eliminada por un administrador${titulo_publicacion ? ` ("${titulo_publicacion}")` : ''}.</p>
    
    <div class="label">Motivo:</div>
    <div class="value">${motivo}</div>
    
    <div class="label">Detalle:</div>
    <div class="value">${detalle}</div>
    
    ${base_reglamentaria ? `
    <div class="label">Base reglamentaria:</div>
    <div class="value">${base_reglamentaria}</div>
    ` : ''}
    
    ${enlace ? `
    <div class="label">Referencia:</div>
    <div class="value"><a href="${enlace}" target="_blank">${enlace}</a></div>
    ` : ''}
    
    <p style="margin-top: 24px;">Si tienes dudas sobre esta acción, puedes responder a este correo o contactar al equipo de moderación.</p>
    
    <div class="footer">
      <p>Este es un mensaje automático del sistema de moderación.</p>
      <p>Foro Universitario © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>
    `

    // Enviar con Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // Usa RESEND_FROM si está definido, si no fallback a sandbox
        from: RESEND_FROM,
        to: [to_email],
        subject: subject || 'Tu publicación fue eliminada',
        html: htmlContent,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true, message_id: data.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('Resend error:', data)
      return new Response(
        JSON.stringify({ error: 'Error al enviar correo', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Function error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
