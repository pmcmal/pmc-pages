import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_FIELD_LENGTH = 200;

// lrclib prosi o identyfikacje aplikacji w User-Agent
const USER_AGENT = "pmc-pages (https://pmcmalec.vercel.app)";

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// "ł" i "Ł" nie rozkladaja sie przez NFD, wiec trzeba je podmienic recznie;
// reszte diakrytykow NFD rozbija na znak bazowy i znak laczacy do usuniecia.
function stripDiacritics(text: string): string {
  return text
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function usable(text: unknown): string | null {
  return typeof text === "string" && text.trim() ? text : null;
}

// --- Zrodlo 1: lrclib.net ---
// Darmowe, bez klucza i z duzo lepszym polskim repertuarem niz lyrics.ovh.
// Radzi sobie tez z polskimi znakami, wiec nie trzeba nic transliterowac.
async function fromLrclibExact(artist: string, title: string): Promise<string | null> {
  const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return null;
  const data = await response.json();
  return usable(data?.plainLyrics);
}

// Dopasowanie rozmyte - ratuje literowki i brakujace ogonki
// (np. "Podsiadło Trojkaty" trafia w "Trójkąty i Kwadraty").
async function fromLrclibSearch(artist: string, title: string): Promise<string | null> {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return null;
  const results = await response.json();
  if (!Array.isArray(results)) return null;
  for (const entry of results) {
    const lyrics = usable(entry?.plainLyrics);
    if (lyrics) return lyrics;
  }
  return null;
}

// --- Zrodlo 2: lyrics.ovh ---
// Zostaje jako zapas. Nie radzi sobie z diakrytykami: "Dawid Podsiadło" zwraca
// 404, a ten sam utwor bez ogonkow oddaje tekst - stad druga proba.
async function fromLyricsOvh(artist: string, title: string): Promise<string | null> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  return usable(data?.lyrics);
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

    const asciiArtist = stripDiacritics(artist);
    const asciiTitle = stripDiacritics(title);
    const hasDiacritics = asciiArtist !== artist || asciiTitle !== title;

    const attempts: (() => Promise<string | null>)[] = [
      () => fromLrclibExact(artist, title),
      () => fromLrclibSearch(artist, title),
      () => fromLyricsOvh(artist, title),
    ];
    if (hasDiacritics) {
      attempts.push(() => fromLyricsOvh(asciiArtist, asciiTitle));
    }

    for (const attempt of attempts) {
      try {
        const lyrics = await attempt();
        if (lyrics) {
          return new Response(JSON.stringify({ lyrics }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      } catch (error) {
        // Pojedyncze zrodlo potrafi oddac 503 albo zerwac polaczenie - to nie
        // powod, zeby przerywac caly lancuch.
        console.error("Zrodlo tekstow zawiodlo:", error);
      }
    }

    return new Response(JSON.stringify({ error: "Nie znaleziono tekstu dla tego utworu." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
