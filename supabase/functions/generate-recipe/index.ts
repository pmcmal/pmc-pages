import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { openRouterTextStreamWithFallback, streamHeaders, withStreaming } from "../_shared/stream.ts";
import { fetchAiText } from "../_shared/ai-providers.ts";
import { splitSections, tryJson } from "../_shared/ai-text.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_PROMPT_LENGTH = 1000;

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
    const requestBody = await req.json();
    const wantsStream = requestBody?.stream === true;
    let { prompt } = requestBody;

    // Handle "Surprise me" logic: if prompt is generic, use a more open-ended prompt
    if (prompt === "losowe składniki") {
      prompt = "zaskocz mnie ciekawym przepisem na danie z losowych składników"; // Make the prompt more explicit for AI
    } else if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    } else if (prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(JSON.stringify({ error: `Prompt jest za długi (max ${MAX_PROMPT_LENGTH} znaków).` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const aiKeys = { openrouterApiKey, geminiApiKey };
    const MAX_TOKENS = 2048;

    const systemPrompt =
      "Jesteś ekspertem kulinarnym i generujesz przepisy na szybkie i proste dania. Jeśli użytkownik poda konkretne składniki, wykorzystaj je. Jeśli poprosi o zaskoczenie lub poda ogólne zapytanie, wygeneruj ciekawy przepis z losowych składników. Odpowiadaj WYŁĄCZNIE zwykłym tekstem w dokładnie takiej strukturze:\n\n### PRZEPIS\n(pełny przepis: lista składników i instrukcje krok po kroku)\n\n### PRZELICZNIKI\n(prosta tabela przeliczników wagi na miary domowe - łyżeczki, szklanki - dla kilku podstawowych składników jak mąka, cukier, woda, olej)\n\nNie zwracaj JSON-a. Upewnij się, że przepis jest łatwy do wykonania.";
    const userPrompt = `Wygeneruj przepis na podstawie dostępnych składników: ${prompt}`;

    // W trybie strumieniowym oddajemy tekst na biezaco - parsowanie na pola
    // robi juz frontend, kiedy strumien sie zamknie. Jesli strumien OpenRoutera
    // nie ruszy w ogole (polaczenie/blad) albo przyjdzie pusty (rozumujacy
    // model zjadl caly budzet), fetchAiText probuje ponownie i w razie
    // potrzeby siega po Gemini - patrz _shared/ai-providers.ts i stream.ts.
    if (wantsStream) {
      try {
        const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            withStreaming({
              model: "openrouter/free",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              max_tokens: MAX_TOKENS,
              provider: { sort: "throughput" },
            }),
          ),
        });

        if (!openrouterResponse.ok) {
          const errorData = await openrouterResponse.json().catch(() => ({}));
          throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} ${JSON.stringify(errorData).slice(0, 200)}`);
        }

        const stream = await openRouterTextStreamWithFallback(openrouterResponse, () =>
          fetchAiText(systemPrompt, userPrompt, aiKeys, MAX_TOKENS),
        );
        return new Response(stream, { headers: streamHeaders(corsHeaders), status: 200 });
      } catch (error) {
        console.error("OpenRouter stream start error, probuje fallbackiem:", error);
        const fallbackText = await fetchAiText(systemPrompt, userPrompt, aiKeys, MAX_TOKENS);
        return new Response(fallbackText, { headers: streamHeaders(corsHeaders), status: 200 });
      }
    }

    const aiResponseContent = await fetchAiText(systemPrompt, userPrompt, aiKeys, MAX_TOKENS);

    // Model oddaje tekst z naglowkami sekcji zamiast JSON-a - przepisy pelne
    // cudzyslowow i lamanych linii nie przechodzily przez JSON.parse.
    const legacy = tryJson(aiResponseContent, jsonrepair, "recipeText");
    let recipeText = String(legacy?.recipeText ?? "").trim();
    let conversionTable = String(legacy?.conversionTable ?? "").trim();

    if (!recipeText) {
      const sections = splitSections(aiResponseContent);
      recipeText = sections["PRZEPIS"] ?? aiResponseContent.trim();
      conversionTable = sections["PRZELICZNIKI"] ?? "";
    }

    return new Response(JSON.stringify({ recipeText, conversionTable }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating recipe:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});