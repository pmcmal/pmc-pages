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

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }

    const dni = dniWMiesiacu(rok, miesiac);
    const nazwa = MIESIACE[miesiac - 1];

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
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
        max_tokens: 4096,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json().catch(() => ({}));
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status}`);
    }

    const data = await openrouterResponse.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("Pusta odpowiedz OpenRouter:", JSON.stringify(data));
      throw new Error("Model AI nie zwrócił treści — darmowy router był chwilowo przeciążony. Spróbuj ponownie za chwilę.");
    }

    const entries = parseCalendar(content, dni);
    if (entries.length === 0) {
      console.error("Nie udalo sie odczytac zadnego wiersza:", content.slice(0, 500));
      throw new Error("Nie udało się odczytać kalendarza z odpowiedzi modelu.");
    }

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
