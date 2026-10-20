# PMCmalec — pmc-pages

[![CI](https://github.com/pmcmal/pmc-pages/actions/workflows/ci.yml/badge.svg)](https://github.com/pmcmal/pmc-pages/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

<img width="1103" height="737" alt="Zrzut ekranu 2026-07-22 144002" src="https://github.com/user-attachments/assets/fd74ec81-6598-4f86-a57e-5155084f7a66" />


<details>
<summary><strong>🇬🇧 English version</strong> (click to expand)</summary>

A collection of my portfolio mini-projects: AI-powered generators, a blog, a CV
builder and a few smaller toys. The frontend is a single React app (Vite +
React Router); the AI parts call Supabase Edge Functions that use free models
through [OpenRouter](https://openrouter.ai) and stream the answer back as it is
written.

## Pages

| Path | What it is | Needs AI backend |
|---|---|---|
| `/` | Home — tiles for every page, theme and language switch | — |
| `/powershell-generator` | PowerShell script generator | ✅ |
| `/philosopher-coach` | Philosopher & life coach | ✅ |
| `/recipe-generator` | Recipe generator | ✅ |
| `/story-generator` | Short story generator | ✅ |
| `/electronic-project-generator` | Electronics project idea generator | ✅ |
| `/lyrics-finder` | Song lyrics search, retro Winamp styling | ✅ (lyrics APIs) |
| `/cv-generator` | CV builder — 5 templates, live preview, PDF via print | — |
| `/blog`, `/blog/:slug` | Blog, posts are Markdown files in `content/blog/` | — |
| `/short-ai-course` | Short interactive AI course with quiz & simulator | — |
| `/weather-forecast-ai` | Smart Weather (OpenWeatherMap, simulated fallback) | — |
| `/portfolio-store` | Terminal-styled demo store | — |
| `/admin` | Editor: posts, drafts, sandbox → home page | ✅ (login required) |

## Stack

- React 18 + TypeScript, Vite 6
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (components in `src/components/ui/` — regenerate via the shadcn CLI, don't hand-edit)
- React Router — all routes defined in [`src/App.tsx`](src/App.tsx)
- i18next — Polish/English, strings in [`src/i18n.ts`](src/i18n.ts)
- react-markdown + remark-gfm for blog rendering
- Supabase Edge Functions (Deno) in `supabase/functions/*`

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

The generators call Supabase Edge Functions that ask an AI model through
OpenRouter. All on free tiers:

1. Create a free project at [supabase.com](https://supabase.com) and copy the
   `Project URL` and `anon key` (Project Settings → API) into `.env.local` as
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Create a free API key at [openrouter.ai/keys](https://openrouter.ai/keys).
3. Log in and link the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
4. Set the secrets:
   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=your_key
   npx supabase secrets set GITHUB_PAT=your_token   # only for the blog/admin functions
   ```
5. Deploy all functions at once:
   ```bash
   npx supabase functions deploy
   ```

Models are selected via `openrouter/free` — OpenRouter's free router, which
picks an available free model itself, so it doesn't need updating when a
specific model stops being free. Free endpoints are served at lower priority,
so the same request can take 6 s or 30 s; that is why the answers are
**streamed** — the first words show up after about a second instead of making
you stare at a spinner.

Responses come back as **plain text with section headings**, not JSON. Asking a
weak model to pack PowerShell or Arduino code into a JSON string meant it broke
on quotes, backslashes and newlines; a code block has nothing to escape. The
shared parser lives in `supabase/functions/_shared/ai-text.ts` (Deno) and
`src/lib/ai-text.ts` (browser) — change the prompt contract and you have to
touch both.

Without this configuration the generators show a communication error — the rest
of the site works normally.

### Weather (optional)

`/weather-forecast-ai` uses [OpenWeatherMap](https://home.openweathermap.org/api_keys)
(free key) — without `VITE_OPENWEATHERMAP_API_KEY` in `.env.local` the page
automatically falls back to simulated data.

## Blog and admin panel

Posts are Markdown files in `content/blog/`, bundled at build time — there is no
database. `/admin` (Supabase Auth login) can:

- write and edit posts, with a live preview and an AI assistant,
- save a post as a **draft** (`draft: true` in the frontmatter) — drafts are
  hidden from the blog and wait in "Oczekujące szkice",
- generate an English translation of a post (`<slug>.en.md`),
- promote a **sandbox** app to the home page.

Sandbox apps (`src/lib/sandbox-apps.ts`) work under their final URL but are not
advertised: no tile on the home page, disallowed in `robots.txt`. Promoting one
adds the tile and the translations, removes the sandbox entry and the
`robots.txt` rule, and optionally writes an AI-drafted blog post about it — all
in a single commit through the Git Data API, so one click equals one deploy and
a failure in the middle cannot leave the repo half-updated.

Every write from the panel is a commit to this repository, which triggers a
Vercel deploy — the panel does not change the live site directly.

## Deploy

The project is configured for [Vercel](https://vercel.com) (`vercel.json`
rewrites every path to `index.html` for React Router). Environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENWEATHERMAP_API_KEY`)
need to be set in the Vercel project dashboard.

Edge functions deploy themselves: `.github/workflows/deploy-functions.yml` runs
on every push that touches `supabase/functions/**` and needs the
`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` repository secrets.

A free Supabase project pauses after 7 days without traffic, so `api/keep-alive.js`
is pinged daily by a Vercel cron (`crons` in `vercel.json`).
`.github/workflows/keep-supabase-awake.yml` does the same as a backup — but note
that GitHub disables scheduled workflows after 60 days without a commit, which
is exactly when they would be needed, so the Vercel cron is the primary one.

## Security

- No secrets are kept in the repo — see `.env.example` and `.gitignore`.
- The OpenRouter key and the GitHub token live only as Supabase Edge Functions
  secrets (`supabase secrets set`), never in frontend code.
- Admin-only functions check for an authenticated role; the icon and colour of a
  promoted tile come from a fixed whitelist, because they end up as literal code
  in `src/pages/Index.tsx`.
- `vercel.json` sets baseline security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- CI (`.github/workflows/ci.yml`) runs typecheck, lint and build on every
  push/PR.

## License

[MIT](LICENSE)

---

Built by Paweł Malec ® · [LinkedIn](https://pl.linkedin.com/in/pmcmalec) · [GitHub](https://github.com/pmcmal) · [tipped.pl/pmcmalec](https://tipped.pl/pmcmalec)

</details>

<details open>
<summary><strong>🇵🇱 Wersja polska</strong> (kliknij, żeby zwinąć)</summary>

Zbiór moich mini-projektów portfolio: generatory oparte na AI, blog, kreator CV
i kilka mniejszych zabawek. Frontend to jedna aplikacja React (Vite + React
Router), a część AI korzysta z Supabase Edge Functions wywołujących darmowe
modele przez [OpenRouter](https://openrouter.ai) i strumieniujących odpowiedź
w trakcie pisania.

## Podstrony

| Ścieżka | Co to jest | Wymaga backendu AI |
|---|---|---|
| `/` | Strona główna — kafelki podstron, przełącznik motywu i języka | — |
| `/powershell-generator` | Generator skryptów PowerShell | ✅ |
| `/philosopher-coach` | Filozof i Coach Życiowy | ✅ |
| `/recipe-generator` | Generator przepisów kulinarnych | ✅ |
| `/story-generator` | Generator opowiadań | ✅ |
| `/electronic-project-generator` | Generator pomysłów na projekty elektroniczne | ✅ |
| `/lyrics-finder` | Wyszukiwarka tekstów piosenek w stylu retro Winamp | ✅ (API z tekstami) |
| `/cv-generator` | Kreator CV — 5 szablonów, podgląd na żywo, PDF przez drukowanie | — |
| `/blog`, `/blog/:slug` | Blog, wpisy to pliki Markdown w `content/blog/` | — |
| `/short-ai-course` | Krótki, interaktywny kurs AI z quizem i symulatorem | — |
| `/weather-forecast-ai` | Inteligentna Pogoda (OpenWeatherMap, z symulowanym fallbackiem) | — |
| `/portfolio-store` | Demo sklepu WWW w stylu terminala | — |
| `/admin` | Panel: wpisy, szkice, promowanie z piaskownicy | ✅ (wymaga logowania) |

## Stack

- React 18 + TypeScript, Vite 6
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (komponenty w `src/components/ui/` — nie edytować ręcznie, tylko przez shadcn CLI)
- React Router — wszystkie trasy zdefiniowane w [`src/App.tsx`](src/App.tsx)
- i18next — polski i angielski, teksty w [`src/i18n.ts`](src/i18n.ts)
- react-markdown + remark-gfm do renderowania bloga
- Supabase Edge Functions (Deno) w `supabase/functions/*`

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

Generatory wywołują Supabase Edge Functions, które pytają model AI przez
OpenRouter. Wszystko na darmowych planach:

1. Załóż darmowy projekt na [supabase.com](https://supabase.com) i skopiuj
   `Project URL` oraz `anon key` (Project Settings → API) do `.env.local` jako
   `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
2. Wygeneruj darmowy klucz na [openrouter.ai/keys](https://openrouter.ai/keys).
3. Zaloguj się i podepnij CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-twojego-projektu>
   ```
4. Ustaw sekrety:
   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=twoj_klucz
   npx supabase secrets set GITHUB_PAT=twoj_token   # tylko dla funkcji bloga i panelu
   ```
5. Wdróż wszystkie funkcje naraz:
   ```bash
   npx supabase functions deploy
   ```

Model wybierany jest przez `openrouter/free` — darmowy router OpenRoutera, który
sam dobiera dostępny model, więc nie trzeba tego aktualizować, gdy konkretny
model przestaje być darmowy. Darmowe endpointy chodzą z niższym priorytetem,
więc to samo zapytanie potrafi trwać 6 albo 30 sekund — dlatego odpowiedzi są
**strumieniowane**: pierwsze słowa pojawiają się po sekundzie, zamiast kazać
patrzeć w spinner.

Modele odpowiadają **zwykłym tekstem z nagłówkami sekcji**, nie JSON-em.
Wciskanie kodu PowerShell czy Arduino do pola JSON-a sypało się na cudzysłowach,
backslashach i znakach nowej linii — w bloku kodu nie ma czego escapować.
Wspólny parser leży w `supabase/functions/_shared/ai-text.ts` (Deno) i
`src/lib/ai-text.ts` (przeglądarka) — zmieniając kontrakt promptu trzeba ruszyć
oba pliki.

Bez tej konfiguracji generatory pokażą błąd komunikacji — reszta strony działa
normalnie.

### Pogoda (opcjonalnie)

`/weather-forecast-ai` korzysta z [OpenWeatherMap](https://home.openweathermap.org/api_keys)
(darmowy klucz) — bez `VITE_OPENWEATHERMAP_API_KEY` w `.env.local` strona
automatycznie przechodzi na dane symulowane.

## Blog i panel admina

Wpisy to pliki Markdown w `content/blog/`, wbudowywane na etapie builda — nie ma
tu żadnej bazy danych. `/admin` (logowanie przez Supabase Auth) pozwala:

- pisać i edytować wpisy, z podglądem na żywo i asystentem AI,
- zapisać wpis jako **szkic** (`draft: true` we frontmatterze) — szkice nie
  pokazują się na blogu, czekają w sekcji „Oczekujące szkice",
- wygenerować angielskie tłumaczenie wpisu (`<slug>.en.md`),
- przenieść apkę z **piaskownicy** na stronę główną.

Apki w piaskownicy (`src/lib/sandbox-apps.ts`) działają pod swoim docelowym
adresem, ale nie są promowane: nie ma ich jako kafelka i są wyłączone
w `robots.txt`. Promowanie dodaje kafelek i tłumaczenia, usuwa wpis
z piaskownicy i regułę z `robots.txt`, a opcjonalnie dopisuje szkic wpisu na
bloga napisany przez AI — wszystko jednym commitem przez Git Data API, więc
jedno kliknięcie to jeden deploy, a błąd w połowie nie zostawi repo w stanie
pośrednim.

Każdy zapis z panelu to commit do tego repozytorium, który uruchamia deploy na
Vercelu — panel nie zmienia działającej strony bezpośrednio.

## Deploy

Projekt jest skonfigurowany pod [Vercel](https://vercel.com) (`vercel.json`
przepisuje każdą ścieżkę na `index.html` dla React Routera). Zmienne
środowiskowe (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_OPENWEATHERMAP_API_KEY`) trzeba ustawić w panelu projektu na Vercelu.

Edge functions wdrażają się same: `.github/workflows/deploy-functions.yml`
uruchamia się przy każdym pushu ruszającym `supabase/functions/**` i wymaga
sekretów repozytorium `SUPABASE_ACCESS_TOKEN` oraz `SUPABASE_PROJECT_ID`.

Darmowy projekt Supabase wstrzymuje się po 7 dniach bez ruchu, więc
`api/keep-alive.js` jest codziennie pingowany cronem Vercela (sekcja `crons`
w `vercel.json`). `.github/workflows/keep-supabase-awake.yml` robi to samo jako
zapas — z tym że GitHub wyłącza zaplanowane workflow po 60 dniach bez commita,
czyli dokładnie wtedy, gdy są najbardziej potrzebne, więc głównym pingiem jest
cron Vercela.

## Bezpieczeństwo

- W repo nie ma żadnych sekretów — patrz `.env.example` i `.gitignore`.
- Klucz OpenRoutera i token GitHuba żyją wyłącznie jako sekrety Supabase Edge
  Functions (`supabase secrets set`), nigdy w kodzie frontendu.
- Funkcje panelu sprawdzają rolę zalogowanego użytkownika, a ikona i kolor
  promowanego kafelka pochodzą z zamkniętej listy, bo trafiają jako literalny
  kod do `src/pages/Index.tsx`.
- `vercel.json` ustawia podstawowe nagłówki bezpieczeństwa
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`).
- CI (`.github/workflows/ci.yml`) uruchamia typecheck, lint i build przy każdym
  pushu i PR-ze.

## Licencja

[MIT](LICENSE)

---

Zrobione przez Pawła Malca ® · [LinkedIn](https://pl.linkedin.com/in/pmcmalec) · [GitHub](https://github.com/pmcmal) · [tipped.pl/pmcmalec](https://tipped.pl/pmcmalec)

</details>
