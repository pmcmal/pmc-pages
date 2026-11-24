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

async function readCachedMonth(rok: number, miesiac: number): Promise<CalendarEntry[] | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const headers = supabaseRestHeaders();
  if (!supabaseUrl || !headers) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/quote_calendar_cache?year=eq.${rok}&month=eq.${miesiac}&select=entries`,
      { headers },
    );
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const entries = rows[0]?.entries;
    return Array.isArray(entries) && entries.length > 0 ? (entries as CalendarEntry[]) : null;
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
    // Prefer: resolution=ignore-duplicates obsluguje wyscig: gdy dwa prawie
    // rownoczesne zapytania o ten sam miesiac oba trafia w brak cache i oba
    // wygeneruja wlasna odpowiedz AI, tylko pierwszy zapis ma sie udac - drugi
    // ma po cichu nic nie zrobic zamiast konczyc sie bledem 409. Zwracana
    // przez TA funkcje odpowiedz i tak idzie do jej wlasnego wywolujacego
    // niezaleznie od wyniku zapisu do cache.
    const response = await fetch(`${supabaseUrl}/rest/v1/quote_calendar_cache`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal,resolution=ignore-duplicates" },
      body: JSON.stringify({ year: rok, month: miesiac, entries }),
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
    const { year, month } = await req.json();

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
    // sam rok+miesiac - wtedy w ogole nie dotykamy AI.
    const cached = await readCachedMonth(rok, miesiac);
    if (cached) {
      return new Response(JSON.stringify({ year: rok, month: miesiac, days: dni, entries: cached }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }

    const nazwa = MIESIACE[miesiac - 1];

    // openrouter/free losuje za kazdym razem inny darmowy model spod spodu.
    // Znany, udokumentowany w wielu projektach problem: czasem trafi sie
    // model "rozumujacy", ktory zuzyje caly max_tokens na ukryte tokeny
    // rozumowania i zwroci 200 z pustym content. Parametr reasoning.exclude
    // NIE pomaga - tylko chowa slad rozumowania z odpowiedzi, token-budzet
    // i tak jest zuzyty (potwierdzone w dokumentacji OpenRoutera), a router
    // nie ujawnia dla openrouter/free, czy wylosowany model w ogole obsluguje
    // ten parametr, wiec lepiej go nie wysylac. Zamiast tego: wiekszy
    // max_tokens (miejsce na rozumowanie i na odpowiedz) + ograniczona liczba
    // prob z osobnym limitem czasu kazda - to najczesciej spotykane podejscie
    // w projektach uzywajacych openrouter/free.
    let entries: CalendarEntry[] = [];
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(35_000),
          body: JSON.stringify({
            model: "openrouter/free",
            provider: { sort: "throughput" },
            messages: [
              {
                role: "system",
                content:
                  "Jesteś znawcą literatury polskiej. Dobierasz cytaty do kalendarza. " +
                  "Podawaj WYŁĄCZNIE cytaty powszechnie znane i faktycznie istniejące - lepiej powtórzyć " +
                  "sławne zdanie niż wymyślić nowe. Nie zmyślaj tytułów ani autorów. " +
                  "Odpowiadaj czystym tekstem: jeden wiersz na dzień, pola rozdzielone znakiem |, " +
                  "w kolejności: numer dnia | cytat | autor | tytuł utworu. " +
                  "Bez nagłówków, bez numeracji listy, bez komentarzy, bez cudzysłowów wokół pól.",
              },
              {
                role: "user",
                content:
                  `Ułóż kalendarz cytatów na ${nazwa} ${rok}. Potrzebuję ${dni} wierszy, po jednym na każdy ` +
                  `dzień od 1 do ${dni}. Cytaty z polskiej literatury - proza i poezja, różni autorzy i epoki, ` +
                  `każdy autor najwyżej dwa razy. Każdy cytat ma być krótki (do 200 znaków) i zrozumiały bez ` +
                  `kontekstu. Jeśli jakiś fragment pasuje do pory roku albo nastroju tego miesiąca, tym lepiej.`,
              },
            ],
            max_tokens: 8192,
          }),
        });

        if (!openrouterResponse.ok) {
          const errorData = await openrouterResponse.json().catch(() => ({}));
          console.error(`Proba ${attempt}/3 - blad OpenRouter:`, openrouterResponse.status, errorData);
          lastError = new Error(`OpenRouter API returned an error: ${openrouterResponse.status}`);
          continue;
        }

        const data = await openrouterResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          console.error(`Proba ${attempt}/3 - pusta odpowiedz OpenRouter:`, JSON.stringify(data).slice(0, 500));
          lastError = new Error("Pusta odpowiedz modelu.");
          continue;
        }

        const parsed = parseCalendar(content, dni);
        if (parsed.length === 0) {
          console.error(`Proba ${attempt}/3 - nie udalo sie odczytac zadnego wiersza:`, content.slice(0, 500));
          lastError = new Error("Nie udało się odczytać kalendarza z odpowiedzi modelu.");
          continue;
        }

        entries = parsed;
        break;
      } catch (error) {
        console.error(`Proba ${attempt}/3 - wyjatek:`, error);
        lastError = error;
      }
    }

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
