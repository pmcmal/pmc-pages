import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_INSTRUCTION_LENGTH = 2000;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function getJwtRole(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const role = getJwtRole(req.headers.get("Authorization"));
  if (role !== "authenticated") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const { instruction, content, title } = await req.json();
    if (!instruction || typeof instruction !== "string") {
      return new Response(JSON.stringify({ error: "instruction jest wymagana" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (instruction.length > MAX_INSTRUCTION_LENGTH) {
      return new Response(JSON.stringify({ error: `Instrukcja jest za długa (max ${MAX_INSTRUCTION_LENGTH} znaków).` }), {
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
            content: "Jesteś asystentem redakcyjnym pomagającym pisać wpisy na osobisty blog techniczny (portfolio dewelopera). Otrzymujesz aktualny tytuł i treść wpisu (mogą być niepełne lub puste) oraz instrukcję od autora (np. 'zaproponuj tytuł', 'popraw styl i literówki', 'rozwiń ten fragment', 'zaproponuj wstęp'). Wykonaj instrukcję. Zwróć WYŁĄCZNIE wynikowy tekst w Markdown, bez komentarzy, wyjaśnień czy dodatkowych wstępów typu 'Oto poprawiona wersja:'.",
          },
          {
            role: "user",
            content: `Tytuł wpisu: ${title || "(brak)"}\n\nAktualna treść:\n${content || "(brak - wpis jeszcze nie napisany)"}\n\nInstrukcja: ${instruction}`,
          },
        ],
        max_tokens: 2048,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openrouterResponse.json();
    const result = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in blog-ai-assist:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
