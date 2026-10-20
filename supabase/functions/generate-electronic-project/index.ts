import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { extractCodeFence, splitSections, toList, tryJson } from "../_shared/ai-text.ts";

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
  "To pomysl wygenerowany przez AI - przed budowa zweryfikuj komponenty, polaczenia i bezpieczenstwo.";

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { prompt } = await req.json();

    if (prompt === "losowy pomysł na projekt elektroniczny na Raspberry Pi, Arduino lub prosty układ do lutowania") {
      prompt = "losowy, ciekawy i prosty do wykonania pomysł na projekt elektroniczny na Raspberry Pi, Arduino lub inny prosty układ do lutowania, np. dla początkujących";
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

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free", // Darmowy router OpenRouter — sam wybiera dostępny darmowy model
        messages: [
          {
            role: "system",
            content: `Jesteś ekspertem od elektroniki i generujesz pomysły na projekty elektroniczne - kreatywne, ale realistyczne i możliwe do wykonania na Raspberry Pi, Arduino lub prostych układach do lutowania. Odpowiadaj WYŁĄCZNIE zwykłym tekstem w dokładnie takiej strukturze:\n\n### OPIS\n(krótki opis projektu i ogólny zarys działania)\n\n### KOMPONENTY\n(lista potrzebnych części, każda w osobnej linii zaczynającej się od myślnika, np. - Arduino Uno)\n\n### KOD\n(jeśli projekt wymaga programowania, przykładowy krótki kod w bloku kodu markdown; jeśli kod nie jest potrzebny, napisz: brak)\n\nNie zwracaj JSON-a.`,
          },
          {
            role: "user",
            content: `Wygeneruj pomysł na projekt elektroniczny dla: ${prompt}`,
          },
        ],
        max_tokens: 1500, // Zwiększono limit tokenów, aby pomieścić kod i komponenty
        provider: { sort: "throughput" }, // preferuj najszybszego dostawce
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
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

    // Tekst z sekcjami zamiast JSON-a: kod Arduino/Python wpychany wczesniej
    // w pole stringa byl najczestsza przyczyna bledu parsowania.
    const legacy = tryJson(aiResponseContent, jsonrepair, "projectIdea");
    let projectIdea = String(legacy?.projectIdea ?? "").trim();
    const legacyComponents = legacy?.componentsNeeded;
    let componentsNeeded = Array.isArray(legacyComponents) ? legacyComponents.map(String) : [];
    let exampleCode = String(legacy?.exampleCode ?? "").trim();

    if (!projectIdea) {
      const sections = splitSections(aiResponseContent);
      const codeSection = sections["KOD"] ?? "";
      const fromCodeSection = extractCodeFence(codeSection);
      const fromWhole = extractCodeFence(aiResponseContent);

      projectIdea = sections["OPIS"] ?? aiResponseContent.trim();
      componentsNeeded = toList(sections["KOMPONENTY"] ?? "");
      exampleCode = fromCodeSection.code || fromWhole.code;
      if (/^brak\.?$/i.test(codeSection.trim())) exampleCode = "";
    }

    const payload = { projectIdea, componentsNeeded, exampleCode, disclaimer: DISCLAIMER };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating electronic project idea:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});