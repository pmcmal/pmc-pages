# PMCmalec — pmc-pages

[![CI](https://github.com/pmcmal/pmc-pages/actions/workflows/ci.yml/badge.svg)](https://github.com/pmcmal/pmc-pages/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

Zbiór moich mini-projektów portfolio: generatory oparte na AI, gra, symulator kursu AI
i demo sklepu. Frontend to jedna aplikacja React (Vite + React Router), a pięć
generatorów AI korzysta z Supabase Edge Functions wywołujących darmowe modele
przez [OpenRouter](https://openrouter.ai).

<details>
<summary><strong>English version</strong> (click to expand)</summary>

# PMCmalec — pmc-pages

A collection of my portfolio mini-projects: AI-powered generators, a game, an
interactive AI-course simulator, and a store demo. The frontend is a single
React app (Vite + React Router); five of the AI generators call Supabase Edge
Functions that use free models through [OpenRouter](https://openrouter.ai).

## Pages

| Path | What it is | Needs AI backend |
|---|---|---|
| `/` | Home — links to every page | — |
| `/powershell-generator` | PowerShell script generator | ✅ |
| `/philosopher-coach` | Philosopher & life coach | ✅ |
| `/recipe-generator` | Recipe generator | ✅ |
| `/story-generator` | Short story generator | ✅ |
| `/electronic-project-generator` | Electronics project idea generator | ✅ |
| `/short-ai-course` | Short interactive AI course with quiz & simulator | — (runs entirely client-side) |
| `/weather-forecast-ai` | Smart Weather (OpenWeatherMap, with a simulated fallback) | — |
| `/space-invaders` | Space Invaders game (canvas) | — |
| `/portfolio-store` | Terminal-styled demo store | — |

## Stack

- React 18 + TypeScript, Vite 6
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (components in `src/components/ui/` — regenerate via the shadcn CLI, don't hand-edit)
- React Router — all routes defined in [`src/App.tsx`](src/App.tsx)
- Supabase Edge Functions (Deno) in `supabase/functions/*` — call OpenRouter

## Running locally

Requires Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.local   # fill in the variables, see "AI backend" below
pnpm dev                     # http://localhost:8080
```

Other useful commands:

```bash
pnpm build       # production build into dist/
pnpm lint        # eslint
pnpm preview     # preview the production build
```

## AI backend (Supabase + OpenRouter)

Five generators (PowerShell, Recipes, Stories, Electronics, Philosopher/Coach)
call a Supabase Edge Function that asks an AI model through OpenRouter. All on
free tiers:

1. Create a free project at [supabase.com](https://supabase.com) and copy the
   `Project URL` and `anon key` (Project Settings → API) into `.env.local` as
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Create a free API key at [openrouter.ai/keys](https://openrouter.ai/keys).
3. Log in and link the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
4. Set the OpenRouter key as a secret (used by all 5 functions):
   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=your_key
   ```
5. Deploy the functions (one by one):
   ```bash
   npx supabase functions deploy generate-powershell-script
   npx supabase functions deploy philosopher-coach
   npx supabase functions deploy generate-recipe
   npx supabase functions deploy generate-story
   npx supabase functions deploy generate-electronic-project
   ```

Models are selected via `openrouter/free` — OpenRouter's free router, which
picks an available free model itself, so it doesn't need updating when a
specific model stops being free.

Without this configuration the generators will show a communication error —
the rest of the site works normally.

### Weather (optional)

`/weather-forecast-ai` uses [OpenWeatherMap](https://home.openweathermap.org/api_keys)
(free key) — without `VITE_OPENWEATHERMAP_API_KEY` in `.env.local` the page
automatically falls back to simulated data.

## Deploy

The project is configured for [Vercel](https://vercel.com) (`vercel.json`
rewrites every path to `index.html` for React Router). Environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENWEATHERMAP_API_KEY`)
need to be set in the Vercel project dashboard.

## Security

- No secrets are kept in the repo — see `.env.example` and `.gitignore`.
- The OpenRouter key lives only as a Supabase Edge Functions secret
  (`supabase secrets set`), never in frontend code.
- `vercel.json` sets baseline security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- CI (`.github/workflows/ci.yml`) runs typecheck, lint and build on every
  push/PR.

## License

[MIT](LICENSE)

---

Built by Paweł Malec ® · [LinkedIn](https://pl.linkedin.com/in/pmcmalec) · [GitHub](https://github.com/pmcmal) · [tipped.pl/pmcmalec](https://tipped.pl/pmcmalec)

</details>

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

## Deploy

Projekt jest skonfigurowany pod [Vercel](https://vercel.com) (`vercel.json` —
przepisuje wszystkie ścieżki na `index.html` dla React Router). Zmienne
środowiskowe (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_OPENWEATHERMAP_API_KEY`) trzeba ustawić w panelu projektu Vercel.

## Bezpieczeństwo

- Żadne sekrety nie są trzymane w repo — patrz `.env.example` i `.gitignore`.
- Klucz OpenRouter żyje wyłącznie jako sekret Supabase Edge Functions (`supabase secrets set`), nigdy w kodzie frontendu.
- `vercel.json` ustawia podstawowe nagłówki bezpieczeństwa (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- CI (`.github/workflows/ci.yml`) uruchamia typecheck, lint i build przy każdym pushu/PR.

## Licencja

[MIT](LICENSE)

---

Stworzył Paweł Malec ® · [LinkedIn](https://pl.linkedin.com/in/pmcmalec) · [GitHub](https://github.com/pmcmal) · [tipped.pl/pmcmalec](https://tipped.pl/pmcmalec)
