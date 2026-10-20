import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_FIELD_LENGTH = 200;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// lyrics.ovh nie radzi sobie z polskimi znakami: "Dawid Podsiadło" / "Trójkąty
// i kwadraty" zwraca 404, a dokladnie ten sam utwor zapisany bez ogonkow oddaje
// pelny tekst. To samo dotyczy Maanamu, Myslovitz czy Lady Pank - czyli
// praktycznie calego polskiego repertuaru. Dlatego po nieudanym zapytaniu
// probujemy jeszcze raz z transliteracja.
//
// NFD rozklada wiekszosc liter na znak bazowy plus znak diakrytyczny, ktory
// potem usuwamy - ale "ł" i "Ł" sie nie rozkladaja, wiec trzeba je podmienic
// recznie.
function stripDiacritics(text: string): string {
  return text
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const response = await fetch(url);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`lyrics.ovh returned ${response.status}`);

  const data = await response.json();
  return typeof data?.lyrics === "string" && data.lyrics.trim() ? data.lyrics : null;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, title } = await req.json();

    if (!artist || !title || typeof artist !== "string" || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "Podaj wykonawcę i tytuł utworu." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (artist.length > MAX_FIELD_LENGTH || title.length > MAX_FIELD_LENGTH) {
      return new Response(JSON.stringify({ error: `Pole może mieć maks. ${MAX_FIELD_LENGTH} znaków.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let lyrics = await fetchLyrics(artist, title);

    // Druga proba bez polskich znakow - dla rodzimego repertuaru to zwykle ona
    // zwraca wynik.
    if (!lyrics) {
      const asciiArtist = stripDiacritics(artist);
      const asciiTitle = stripDiacritics(title);
      if (asciiArtist !== artist || asciiTitle !== title) {
        lyrics = await fetchLyrics(asciiArtist, asciiTitle);
      }
    }

    if (!lyrics) {
      return new Response(JSON.stringify({ error: "Nie znaleziono tekstu dla tego utworu." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(JSON.stringify({ lyrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
