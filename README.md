# PMCmalec — pmc-pages

Zbiór moich mini-projektów portfolio: generatory oparte na AI, gra, symulator kursu AI
i demo sklepu. Frontend to jedna aplikacja React (Vite + React Router), a pięć
generatorów AI korzysta z Supabase Edge Functions wywołujących darmowe modele
przez [OpenRouter](https://openrouter.ai).

## Podstrony

| Ścieżka | Co to jest | Wymaga backendu AI |
|---|---|---|
| `/` | Strona główna — spis wszystkich podstron | — |
| `/powershell-generator` | Generator skryptów PowerShell | ✅ |
| `/philosopher-coach` | Filozof i Coach Życiowy | ✅ |
| `/recipe-generator` | Generator przepisów kulinarnych | ✅ |
| `/story-generator` | Generator opowiadań | ✅ |
| `/electronic-project-generator` | Generator pomysłów na projekty elektroniczne | ✅ |
| `/short-ai-course` | Krótki, interaktywny kurs AI z quizem i symulatorem | — (działa lokalnie w przeglądarce) |
| `/weather-forecast-ai` | Inteligentna Pogoda (OpenWeatherMap, z symulowanym fallbackiem) | — |
| `/space-invaders` | Gra Space Invaders (canvas) | — |
| `/portfolio-store` | Demo sklepu WWW w stylu terminala | — |

## Stack

- React 18 + TypeScript, Vite 6
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (komponenty w `src/components/ui/` — nie edytować ręcznie, tylko przez shadcn CLI)
- React Router — wszystkie trasy zdefiniowane w [`src/App.tsx`](src/App.tsx)
- Supabase Edge Functions (Deno) w `supabase/functions/*` — wywołują OpenRouter
- Capacitor (`android/`, `ios/`) — opcjonalne, do budowania wersji mobilnej

## Uruchomienie lokalnie

Wymagany Node 20+ i [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.local   # wypełnij zmienne, patrz sekcja "Backend AI" poniżej
pnpm dev                     # http://localhost:8080
```

Inne przydatne komendy:

```bash
pnpm build       # build produkcyjny do dist/
pnpm lint        # eslint
pnpm preview     # podgląd builda produkcyjnego
```

## Backend AI (Supabase + OpenRouter)

Pięć generatorów (PowerShell, Przepisy, Opowiadania, Elektronika, Filozof/Coach)
wywołuje Supabase Edge Function, która pyta model AI przez OpenRouter. Wszystko
oparte na darmowych warstwach:

1. Załóż darmowy projekt na [supabase.com](https://supabase.com) i skopiuj
   `Project URL` oraz `anon key` (Project Settings → API) do `.env.local`
   jako `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
2. Załóż darmowy klucz API na [openrouter.ai/keys](https://openrouter.ai/keys).
3. Zaloguj CLI i podlinkuj projekt:
   ```bash
   npx supabase login
   npx supabase link --project-ref <twój-project-ref>
   ```
4. Ustaw sekret z kluczem OpenRouter (używany przez wszystkie 5 funkcji):
   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=twój_klucz
   ```
5. Wgraj funkcje (każdą z osobna):
   ```bash
   npx supabase functions deploy generate-powershell-script
   npx supabase functions deploy philosopher-coach
   npx supabase functions deploy generate-recipe
   npx supabase functions deploy generate-story
   npx supabase functions deploy generate-electronic-project
   ```

Modele wybierane są przez `openrouter/free` — darmowy router OpenRouter, który
sam dobiera dostępny darmowy model, więc nie wymaga aktualizacji, gdy konkretny
model przestanie być darmowy.

Bez tej konfiguracji generatory pokażą błąd komunikacji z AI — reszta strony
działa normalnie.

### Pogoda (opcjonalnie)

`/weather-forecast-ai` używa [OpenWeatherMap](https://home.openweathermap.org/api_keys)
(darmowy klucz) — bez `VITE_OPENWEATHERMAP_API_KEY` w `.env.local` strona
automatycznie przełącza się na symulowane dane.

## Wersja mobilna (Capacitor)

`android/` i `ios/` to szkielety Capacitor. Po zmianach w `capacitor.config.ts`
lub w buildzie webowym zsynchronizuj je przed budowaniem w Android Studio / Xcode:

```bash
pnpm build
npx cap sync
```

## Deploy

Projekt jest skonfigurowany pod [Vercel](https://vercel.com) (`vercel.json` —
przepisuje wszystkie ścieżki na `index.html` dla React Router). Zmienne
środowiskowe (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_OPENWEATHERMAP_API_KEY`) trzeba ustawić w panelu projektu Vercel.

---

Stworzył Paweł Malec ® · [tipped.pl/pmcmalec](https://tipped.pl/pmcmalec)
