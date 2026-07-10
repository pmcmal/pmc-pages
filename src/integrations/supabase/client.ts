import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY w zmiennych środowiskowych. ' +
    'Generatory AI oparte na Supabase Edge Functions nie będą działać, dopóki nie skonfigurujesz .env.local.'
  );
}

// createClient rzuca błąd (i wywala całą aplikację przy starcie, bo ten moduł
// jest importowany przez wszystkie strony generatorów) jeśli URL nie jest
// poprawnym adresem — placeholder trzyma appkę żywą, wywołania i tak
// nieszkodliwie zawiodą, jeśli brakuje realnej konfiguracji.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);