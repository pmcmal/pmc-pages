import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_FIELD_LENGTH = 8000;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title = "", excerpt = "", content = "" } = await req.json();

    if ([title, excerpt, content].some((f) => typeof f !== "string" || f.length > MAX_FIELD_LENGTH)) {
      return new Response(JSON.stringify({ error: `Każde pole musi być tekstem do ${MAX_FIELD_LENGTH} znaków.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!title && !excerpt && !content) {
      return new Response(JSON.stringify({ error: "Podaj przynajmniej jedno pole do przetłumaczenia." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }

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
            content: "Jesteś tłumaczem technicznym. Otrzymujesz obiekt JSON z polami 'title', 'excerpt', 'content' wpisu bloga po polsku (pola moga byc puste). Przetłumacz KAŻDE niepuste pole na angielski. Zachowaj dokładnie formatowanie Markdown (nagłówki, listy, linki, obrazy, bloki kodu), adresy URL i fragmenty kodu bez zmian - tłumacz tylko naturalny tekst. Zwróć WYŁĄCZNIE obiekt JSON z dokładnie tymi samymi trzema polami (title, excerpt, content), bez żadnych komentarzy ani wyjaśnień.",
          },
          {
            role: "user",
            content: JSON.stringify({ title, excerpt, content }),
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openrouterResponse.json();
    const aiResponseContent = data.choices?.[0]?.message?.content ?? "";

    let parsed;
    const jsonCandidate = extractJson(aiResponseContent);
    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(jsonCandidate));
      } catch (e) {
        console.error("Failed to parse translation as JSON:", aiResponseContent, e);
        // Fallback: zwroc oryginal nieprzetlumaczony, zamiast zepsutego tekstu
        parsed = { title, excerpt, content };
      }
    }

    return new Response(
      JSON.stringify({
        title: typeof parsed.title === "string" ? parsed.title : title,
        excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : excerpt,
        content: typeof parsed.content === "string" ? parsed.content : content,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error("Error translating blog post:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
