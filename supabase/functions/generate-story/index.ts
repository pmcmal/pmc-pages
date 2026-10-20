import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { openRouterTextStream, streamHeaders, withStreaming } from "../_shared/stream.ts";
import { tryJson } from "../_shared/ai-text.ts";

const ALLOWED_ORIGINS = ["https://pmcmalec.vercel.app", "http://localhost:8080"];
const MAX_FIELD_LENGTH = 300;

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const DISCLAIMER =
  "To opowiadanie wygenerowala AI, a jego dlugosc ogranicza pojedyncza odpowiedz modelu.";

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const wantsStream = requestBody?.stream === true;
    let { genre, character, event } = requestBody;

    // Handle "Surprise me" logic: if fields are generic, use a more open-ended prompt
    if (genre === "losowy gatunek" && character === "losowa postać" && event === "losowe zdarzenie") {
      genre = "dowolny gatunek";
      character = "dowolna postać";
      event = "dowolne zdarzenie";
    } else {
      if (!genre || !character || !event) {
        return new Response(JSON.stringify({ error: "Genre, character, and event are required" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      if (genre.length > MAX_FIELD_LENGTH || character.length > MAX_FIELD_LENGTH || event.length > MAX_FIELD_LENGTH) {
        return new Response(JSON.stringify({ error: `Każde pole może mieć maks. ${MAX_FIELD_LENGTH} znaków.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
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
          content: `Jesteś utalentowanym pisarzem. Twoim zadaniem jest generowanie spójnych, wciągających i **szczegółowych opowiadań, podzielonych na logiczne akapity**, na podstawie podanych przez użytkownika informacji. Opowiadanie powinno być tak długie, jak to możliwe w ramach jednej odpowiedzi (około 1000-3000 słów). Zwróć WYŁĄCZNIE samo opowiadanie, zwykłym tekstem. Nie zwracaj JSON-a, nie dodawaj tytułu sekcji, komentarzy ani bloków kodu.`,
        },
        {
          role: "user",
          content: `Wygeneruj opowiadanie. Gatunek: ${genre}, Postać: ${character}, Zdarzenie: ${event}.`,
        },
      ],
      max_tokens: 4096, // Ustawienie na 4096 tokenów dla dłuższych odpowiedzi
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

    // Opowiadanie to czysty tekst - nie ma po co przepuszczac go przez JSON,
    // bo to wlasnie escapowanie cudzyslowow i nowych linii sie sypalo.
    const legacy = tryJson(aiResponseContent, jsonrepair, "story");
    const story = String(legacy?.story ?? aiResponseContent).trim();

    return new Response(JSON.stringify({ story, disclaimer: DISCLAIMER }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating story:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});