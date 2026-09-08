import { createClient } from '@supabase/supabase-js';

// Cliente Supabase. As credenciais vêm do .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// Sem elas, o app exibe uma tela pedindo configuração — nunca "finge" com dados falsos.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
