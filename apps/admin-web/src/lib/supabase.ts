import { createClient } from '@supabase/supabase-js';

// Environment variable reading with safe fallback for production / demo testing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-college-bus.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key';

export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
