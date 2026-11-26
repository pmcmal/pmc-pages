import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { openRouterTextStreamWithFallback, streamHeaders, withStreaming } from "../_shared/stream.ts";
import { fetchAiText } from "../_shared/ai-providers.ts";
import { tryJson } from "../_shared/ai-text.ts";

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

const DISCLAIMER =
  "To porada wygenerowana przez AI i nie zastepuje profesjonalnej pomocy.";

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const wantsStream = requestBody?.stream === true;
    let { problem } = requestBody;

    // Handle "Surprise me" logic: if problem is generic, use a more open-ended prompt
    if (problem === "losowy problem życiowy") {
      problem = "dowolny problem życiowy"; // Use a more open-ended prompt for AI
    } else if (!problem) {
      return new Response(JSON.stringify({ error: "Problem description is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    } else if (problem.length > MAX_PROMPT_LENGTH) {
      return new Response(JSON.stringify({ error: `Opis problemu jest za długi (max ${MAX_PROMPT_LENGTH} znaków).` }), {
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
    const MAX_TOKENS = 1024;

    const systemPrompt =
      "Jesteś profesjonalnym filozofem i coachem życiowym. Twoim zadaniem jest udzielanie głębokich, przemyślanych i inspirujących porad życiowych na podstawie problemów przedstawionych przez użytkownika. Skup się na perspektywie filozoficznej, zachęcaj do refleksji i oferuj konstruktywne podejście. Zwróć WYŁĄCZNIE samą poradę, zwykłym tekstem. Nie zwracaj JSON-a ani bloków kodu.";
    const userPrompt = `Mój problem: ${problem}`;

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

    // Porada to czysty tekst - JSON byl tu zbedna warstwa, ktora potrafila
    // sie rozsypac na cudzyslowach i znakach nowej linii.
    const legacy = tryJson(aiResponseContent, jsonrepair, "advice");
    const advice = String(legacy?.advice ?? aiResponseContent).trim();

    return new Response(JSON.stringify({ advice, disclaimer: DISCLAIMER }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating philosophical advice:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});