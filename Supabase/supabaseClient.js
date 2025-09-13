import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilgimatolextscahokhm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZ2ltYXRvbGV4dHNjYWhva2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjA2MDIsImV4cCI6MjA2OTYzNjYwMn0.uG_-niqvGqiCMPg9W8DnRk1xzsLLSH8jdd0ZR22t5dE';
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
