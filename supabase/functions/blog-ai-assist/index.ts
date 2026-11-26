import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { fetchAiText } from "../_shared/ai-providers.ts";

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const systemPrompt =
      "Jesteś asystentem redakcyjnym pomagającym pisać wpisy na osobisty blog techniczny (portfolio dewelopera). Otrzymujesz aktualny tytuł i treść wpisu (mogą być niepełne lub puste) oraz instrukcję od autora (np. 'zaproponuj tytuł', 'popraw styl i literówki', 'rozwiń ten fragment', 'zaproponuj wstęp'). Wykonaj instrukcję. Zwróć WYŁĄCZNIE wynikowy tekst w Markdown, bez komentarzy, wyjaśnień czy dodatkowych wstępów typu 'Oto poprawiona wersja:'.";
    const userPrompt = `Tytuł wpisu: ${title || "(brak)"}\n\nAktualna treść:\n${content || "(brak - wpis jeszcze nie napisany)"}\n\nInstrukcja: ${instruction}`;

    const result = await fetchAiText(systemPrompt, userPrompt, { openrouterApiKey, geminiApiKey }, 2048);

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
