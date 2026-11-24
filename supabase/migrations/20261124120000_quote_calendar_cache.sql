-- Cache dla kalendarza cytatow, wspolny dla wszystkich odwiedzajacych.
--
-- Bez tej tabeli kazdy pierwszy w danym miesiacu odwiedzajacy strony osobno
-- odpytuje AI, bo cache w localStorage jest tylko per przegladarka. Przy
-- wiekszym ruchu to marnuje wspolny, darmowy limit OpenRoutera (50 zapytan
-- na dobe) na generowanie TEGO SAMEGO miesiaca wielokrotnie. Ta tabela
-- sprawia, ze AI jest pytane co najwyzej raz na rok+miesiac, dla wszystkich
-- razem - edge function sprawdza ja przed wywolaniem AI (patrz
-- generate-quote-calendar/index.ts).
--
-- Dostep ma wylacznie service_role (edge function laczy sie kluczem, ktory
-- Supabase sam wstrzykuje do kazdej funkcji jako SUPABASE_SERVICE_ROLE_KEY).
-- Frontend nigdy nie rozmawia z ta tabela bezposrednio - woła wylacznie
-- edge function, tak jak dotychczas.

create table if not exists public.quote_calendar_cache (
  year smallint not null,
  month smallint not null,
  entries jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (year, month)
);

-- RLS wlaczone bez zadnych polityk: nawet gdyby ktos kiedys przez pomylke
-- nadal szerokie uprawnienia anon/authenticated, polityka domyslnie
-- odmawia dostepu do wierszy. service_role i tak omija RLS.
alter table public.quote_calendar_cache enable row level security;

-- Od 30 pazdziernika 2026 Supabase przestal automatycznie nadawac dostep
-- do Data API nawet dla service_role na nowych tabelach w schemacie public -
-- bez tego jawnego GRANT edge function dostalaby "permission denied" mimo
-- uzycia klucza service_role.
grant select, insert, update, delete on public.quote_calendar_cache to service_role;
