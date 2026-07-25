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

    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const lyricsResponse = await fetch(url);

    if (lyricsResponse.status === 404) {
      return new Response(JSON.stringify({ error: "Nie znaleziono tekstu dla tego utworu." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    if (!lyricsResponse.ok) {
      throw new Error(`lyrics.ovh returned ${lyricsResponse.status}`);
    }

    const data = await lyricsResponse.json();
    if (!data.lyrics) {
      return new Response(JSON.stringify({ error: "Nie znaleziono tekstu dla tego utworu." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(JSON.stringify({ lyrics: data.lyrics }), {
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
