import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const MIESIACE = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

const dniWMiesiacu = (rok: number, miesiac: number) => new Date(rok, miesiac, 0).getDate();

export interface CalendarEntry {
  day: number;
  quote: string;
  author: string;
  work: string;
}

/**
 * Model odpowiada wierszami rozdzielonymi pionowa kreska, nie JSON-em.
 * Cytaty literackie sa pelne cudzyslowow, myslnikow i przecinkow - czyli
 * dokladnie tego, co slabsze darmowe modele zle escapuja w stringu JSON.
 * W wierszu nie ma czego escapowac poza sama kreska.
 */
export function parseCalendar(raw: string, maxDays: number): CalendarEntry[] {
  const entries = new Map<number, CalendarEntry>();

  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line
      .replace(/^\s*(?:[-*>]|\d+[.)])\s*/, "")
      .replace(/^\s*```.*$/, "")
      .trim();
    if (!cleaned || !cleaned.includes("|")) continue;

    const parts = cleaned.split("|").map((p) => p.trim());
    if (parts.length < 4) continue;

    const day = Number(parts[0].replace(/\D/g, ""));
    if (!Number.isInteger(day) || day < 1 || day > maxDays) continue;

    const quote = parts[1].replace(/^["'„”]+|["'„”]+$/g, "").trim();
    const author = parts[2].replace(/^["'„”]+|["'„”]+$/g, "").trim();
    const work = parts.slice(3).join(" | ").replace(/^["'„”*_]+|["'„”*_]+$/g, "").trim();

    if (quote.length < 15 || !author || !work) continue;
    if (!entries.has(day)) entries.set(day, { day, quote, author, work });
  }

  return [...entries.values()].sort((a, b) => a.day - b.day);
}

// --- dwa niezalezne dostawce AI, zeby cos zwrocil nawet gdy jeden pada ---
//
// openrouter/free losuje za kazdym razem inny darmowy model spod spodu.
// Znany, udokumentowany w wielu projektach problem: czasem trafi sie model
// "rozumujacy", ktory zuzyje caly max_tokens na ukryte tokeny rozumowania
// i zwroci 200 z pustym content. Parametr reasoning.exclude NIE pomaga -
// tylko chowa slad rozumowania z odpowiedzi, token-budzet i tak jest zuzyty
// (potwierdzone w dokumentacji OpenRoutera), a router nie ujawnia dla
// openrouter/free, czy wylosowany model w ogole obsluguje ten parametr.
//
// Gemini (generativelanguage.googleapis.com) to zupelnie inna infrastruktura
// niz OpenRouter - gdy OpenRouter akurat szwankuje, Gemini zwykle nie ma
// tego samego problemu w tym samym momencie (i odwrotnie - model Gemini
// "lite" tez bywa chwilowo przeciazony, 503 "high demand"). Jest wolany
// TYLKO jako siatka bezpieczenstwa, gdy OpenRouterowi nie uda sie pokryc
// wszystkich dni - reszta serwisu zostaje przy samym OpenRouterze.
// GEMINI_API_KEY jest opcjonalny: bez niego funkcja dziala dokladnie tak
// jak wczesniej, samym OpenRouterem.
const AI_TIMEOUT_MS = 30_000;

async function callOpenRouter(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: "openrouter/free",
      provider: { sort: "throughput" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API returned an error: ${response.status} ${JSON.stringify(errorData).slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pusta odpowiedz OpenRouter.");
  return content;
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API returned an error: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Pusta odpowiedz Gemini.");
  return content;
}

// --- cache w bazie, wspolny dla wszystkich odwiedzajacych ---
//
// Cache w localStorage przegladarki chroni tylko jedna osobe przed ponownym
// pytaniem AI o ten sam miesiac. Bez cache po stronie serwera kazdy PIERWSZY
// w danym miesiacu odwiedzajacy (z innej przegladarki, innego urzadzenia)
// i tak odpytuje AI od nowa - przy wiekszym ruchu to marnuje wspolny, darmowy
// limit OpenRoutera na generowanie tego samego miesiaca wielokrotnie.
//
// SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY Supabase wstrzykuje automatycznie
// do kazdej edge function - nie trzeba ich ustawiac recznie jak OPENROUTER_API_KEY.
//
// Zarowno odczyt jak i zapis sa "best effort": jesli tabeli jeszcze nie ma
// (migracja niewykonana) albo zapytanie zawiedzie z jakiegokolwiek innego
// powodu, funkcja ma dzialac dokladnie tak jak bez cache - nigdy nie psuc
// glownej funkcjonalnosci z powodu problemu z cache.
function supabaseRestHeaders(): Record<string, string> | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) return null;
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

interface CachedRow {
  entries: CalendarEntry[];
  generatedAt: string;
}

async function readCachedMonth(rok: number, miesiac: number): Promise<CachedRow | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const headers = supabaseRestHeaders();
  if (!supabaseUrl || !headers) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/quote_calendar_cache?year=eq.${rok}&month=eq.${miesiac}&select=entries,generated_at`,
      { headers },
    );
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const entries = rows[0]?.entries;
    const generatedAt = rows[0]?.generated_at;
    if (!Array.isArray(entries) || entries.length === 0 || typeof generatedAt !== "string") return null;
    return { entries: entries as CalendarEntry[], generatedAt };
  } catch (error) {
    console.error("Odczyt cache kalendarza zawiodl (dzialam bez cache):", error);
    return null;
  }
}

async function writeCachedMonth(rok: number, miesiac: number, entries: CalendarEntry[]): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const headers = supabaseRestHeaders();
  if (!supabaseUrl || !headers) return;

  try {
    // Prefer: resolution=merge-duplicates (upsert po kluczu glownym year+month)
    // zamiast ignore-duplicates: przycisk "Losuj ponownie" ma realnie
    // nadpisac juz zapisany wiersz (np. gdy poprzednia generacja nie pokryla
    // wszystkich dni), a nie po cichu nic nie robic bo wiersz juz istnieje.
    // Przy zwyklym wyscigu dwoch rownoczesnych zapytan o ten sam miesiac to
    // i tak dziala poprawnie - po prostu wygrywa ten zapis, ktory dotrze
    // jako drugi, bez bledu 409.
    const response = await fetch(`${supabaseUrl}/rest/v1/quote_calendar_cache`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({ year: rok, month: miesiac, entries, generated_at: new Date().toISOString() }),
    });
    if (!response.ok) {
      console.error("Zapis do cache kalendarza zawiodl:", response.status, await response.text().catch(() => ""));
    }
  } catch (error) {
    console.error("Zapis do cache kalendarza zawiodl (nie przerywam odpowiedzi):", error);
  }
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { year, month, force } = await req.json();

    const rok = Number(year);
    const miesiac = Number(month);
    if (!Number.isInteger(rok) || rok < 2020 || rok > 2100 || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > 12) {
      return new Response(JSON.stringify({ error: "Podaj poprawny rok i miesiąc." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const dni = dniWMiesiacu(rok, miesiac);

    // Ktos inny (inna przegladarka, inne urzadzenie) mogl juz wygenerowac ten
    // sam rok+miesiac - wtedy w ogole nie dotykamy AI. "force" (przycisk
    // "Losuj ponownie") pomija ten odczyt i wymusza nowe pytanie do AI - ale
    // tylko jesli poprzednia generacja nie byla sekundy temu, zeby ktos nie
    // mogl w petli (recznie albo skryptem) bez przerwy zerowac wspolny,
    // darmowy limit OpenRoutera samym "force".
    const cachedRow = await readCachedMonth(rok, miesiac);
    const cacheAgeMs = cachedRow ? Date.now() - new Date(cachedRow.generatedAt).getTime() : Infinity;
    const respectForce = force === true && cacheAgeMs >= 30_000;
    if (cachedRow && !respectForce) {
      return new Response(JSON.stringify({ year: rok, month: miesiac, days: dni, entries: cachedRow.entries }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }

    const nazwa = MIESIACE[miesiac - 1];

    const systemPrompt =
      "Jesteś znawcą literatury polskiej. Dobierasz cytaty do kalendarza. " +
      "Podawaj WYŁĄCZNIE cytaty powszechnie znane i faktycznie istniejące - lepiej powtórzyć " +
      "sławne zdanie niż wymyślić nowe. Nie zmyślaj tytułów ani autorów. " +
      "Odpowiadaj czystym tekstem: jeden wiersz na dzień, pola rozdzielone znakiem |, " +
      "w kolejności: numer dnia | cytat | autor | tytuł utworu. " +
      "Bez nagłówków, bez numeracji listy, bez komentarzy, bez cudzysłowów wokół pól.";
    const userPrompt =
      `Ułóż kalendarz cytatów na ${nazwa} ${rok}. Potrzebuję ${dni} wierszy, po jednym na każdy ` +
      `dzień od 1 do ${dni}. Cytaty z polskiej literatury - proza i poezja, różni autorzy i epoki, ` +
      `każdy autor najwyżej dwa razy. Każdy cytat ma być krótki (do 200 znaków) i zrozumiały bez ` +
      `kontekstu. Jeśli jakiś fragment pasuje do pory roku albo nastroju tego miesiąca, tym lepiej.`;

    // Kazda proba (niezaleznie od dostawcy) moze pokryc inny podzbior dni -
    // wyniki sa laczone po numerze dnia, a nie zastepowane, zeby nie wyrzucac
    // juz zdobytych, poprawnych wierszy tylko dlatego, ze kolejna proba byla
    // gorsza. Limity prob i timeout na probe sa tak dobrane, zeby nawet w
    // najgorszym razie (wszystkie proby obu dostawcow wolne) zmiescic sie
    // w budzecie czasowym Supabase dla darmowego planu (~150s).
    const byDay = new Map<number, CalendarEntry>();
    let lastError: unknown = null;

    const tryProvider = async (label: string, call: () => Promise<string>) => {
      try {
        const content = await call();
        const parsed = parseCalendar(content, dni);
        if (parsed.length === 0) {
          console.error(`${label} - nie udalo sie odczytac zadnego wiersza:`, content.slice(0, 500));
          lastError = new Error("Nie udało się odczytać kalendarza z odpowiedzi modelu.");
          return;
        }
        for (const entry of parsed) {
          if (!byDay.has(entry.day)) byDay.set(entry.day, entry);
        }
        if (byDay.size < dni) {
          console.error(`${label} - pokryto ${byDay.size}/${dni} dni, probuje dalej.`);
        }
      } catch (error) {
        console.error(`${label} - wyjatek:`, error);
        lastError = error;
      }
    };

    for (let attempt = 1; attempt <= 2 && byDay.size < dni; attempt++) {
      await tryProvider(`OpenRouter proba ${attempt}/2`, () => callOpenRouter(openrouterApiKey, systemPrompt, userPrompt));
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      for (let attempt = 1; attempt <= 2 && byDay.size < dni; attempt++) {
        await tryProvider(`Gemini proba ${attempt}/2`, () => callGemini(geminiApiKey, systemPrompt, userPrompt));
      }
    }

    const entries = [...byDay.values()].sort((a, b) => a.day - b.day);
    if (entries.length === 0) {
      console.error("Wszystkie proby wyczerpane, ostatni blad:", lastError);
      throw new Error("Model AI nie zwrócił treści — darmowy router był chwilowo przeciążony. Spróbuj ponownie za chwilę.");
    }

    // Best effort - wynik i tak wracamy do wywolujacego nawet jesli zapis
    // do cache sie nie uda (patrz komentarz przy writeCachedMonth).
    await writeCachedMonth(rok, miesiac, entries);

    return new Response(JSON.stringify({ year: rok, month: miesiac, days: dni, entries }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating quote calendar:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
