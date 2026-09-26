import { createClient } from '@supabase/supabase-js';

// Environment variables configured in apps/admin-web/.env or Vercel with fallback to live production project
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL || 
  'https://ztsmxehwjyriyihypppu.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0c214ZWh3anlyaXlpaHlwcHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTA4NTMsImV4cCI6MjEwNTQ4Njg1M30.16sn2O8c1HGA6lJTD0TbWYG9lvnHFrhU6-fZXlbmwi4';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-url'));

// Initialize Supabase Client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Health check helper to verify Supabase database connection
 */
export async function testDatabaseConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase credentials not found in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Running in Local Offline / Demo Data mode.'
    };
  }

  try {
    const { data, error } = await supabase.from('routes').select('count').limit(1);
    if (error) {
      return {
        success: false,
        message: `Database connection error: ${error.message}`
      };
    }
    return {
      success: true,
      message: '✅ Successfully connected to Supabase PostgreSQL Database with Realtime enabled!',
      data
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reach Supabase: ${err?.message || 'Network error'}`
    };
  }
}
