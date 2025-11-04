import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilgimatolextscahokhm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZ2ltYXRvbGV4dHNjYWhva2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjA2MDIsImV4cCI6MjA2OTYzNjYwMn0.uG_-niqvGqiCMPg9W8DnRk1xzsLLSH8jdd0ZR22t5dE';

// Configuración para manejar mejor errores de red en web
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // Configuración más robusta para realtime en web
    params: {
      eventsPerSecond: 10,
    },
    // Manejo de errores de WebSocket
    reconnectAfterMs: (tries) => {
      return Math.min(tries * 1000, 30000); // Reconnect with exponential backoff, max 30s
    },
  },
  global: {
    // Timeout más largo para conexiones lentas
    headers: {
      'x-application-name': 'foro-universitario-app',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)
