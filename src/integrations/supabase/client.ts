import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmmikthvzfvttfmybxgz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbWlrdGh2emZ2dHRmbXlieGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA2MjEsImV4cCI6MjA3NDc0NjYyMX0.o1DTi7ABl1qiBH-tUDPwsDrCTOd_P3kGRH5qlUEkwqI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);