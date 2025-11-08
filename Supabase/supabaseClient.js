import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://ilgimatolextscahokhm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZ2ltYXRvbGV4dHNjYWhva2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjA2MDIsImV4cCI6MjA2OTYzNjYwMn0.uG_-niqvGqiCMPg9W8DnRk1xzsLLSH8jdd0ZR22t5dE';

// Configuración optimizada para React Native/Expo
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Importante para React Native
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)

// Cliente alterno sin opciones extra (por si se requiere en el futuro)
export const supabasePlain = createClient(supabaseUrl, supabaseAnonKey)
