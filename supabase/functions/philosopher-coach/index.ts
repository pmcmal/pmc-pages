import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { openRouterTextStream, streamHeaders, withStreaming } from "../_shared/stream.ts";
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

    const requestPayload = {
      model: "openrouter/free", // Darmowy router OpenRouter — sam wybiera dostępny darmowy model
      messages: [
        {
          role: "system",
          content: `Jesteś profesjonalnym filozofem i coachem życiowym. Twoim zadaniem jest udzielanie głębokich, przemyślanych i inspirujących porad życiowych na podstawie problemów przedstawionych przez użytkownika. Skup się na perspektywie filozoficznej, zachęcaj do refleksji i oferuj konstruktywne podejście. Zwróć WYŁĄCZNIE samą poradę, zwykłym tekstem. Nie zwracaj JSON-a ani bloków kodu.`,
        },
        {
          role: "user",
          content: `Mój problem: ${problem}`,
        },
      ],
      max_tokens: 1024,
      provider: { sort: "throughput" }, // preferuj najszybszego dostawce
    };

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wantsStream ? withStreaming(requestPayload) : requestPayload),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    // W trybie strumieniowym oddajemy tekst na biezaco - parsowanie na pola
    // robi juz frontend, kiedy strumien sie zamknie.
    if (wantsStream) {
      return new Response(openRouterTextStream(openrouterResponse), {
        headers: streamHeaders(corsHeaders),
        status: 200,
      });
    }

    const data = await openrouterResponse.json();
    // Darmowy router potrafi oddac 200 z pustym choices (brak wolnego dostawcy,
    // limit, filtr tresci) - bez tej kontroli leci TypeError i uzytkownik widzi
    // generyczny blad 500 zamiast informacji, ze warto sprobowac ponownie.
    const aiResponseContent = data.choices?.[0]?.message?.content;
    if (!aiResponseContent) {
      console.error("Pusta odpowiedz OpenRouter:", JSON.stringify(data));
      throw new Error("Model AI nie zwrocil tresci - darmowy router byl chwilowo przeciazony. Sprobuj ponownie za chwile.");
    }

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