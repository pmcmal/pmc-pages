import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";
import { openRouterTextStreamWithFallback, streamHeaders, withStreaming } from "../_shared/stream.ts";
import { fetchAiText } from "../_shared/ai-providers.ts";

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

function cleanNotes(text: string): string {
  return text.replace(/^---UWAGI---$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

// Model ma oddawac czysty tekst: blok ```powershell z kodem, a pod nim opcjonalne
// uwagi po linii ---UWAGI---. Wczesniej wymuszalismy JSON {script, explanation} i to
// byla glowna przyczyna komunikatu "Nie udalo sie przetworzyc odpowiedzi AI": kod
// PowerShell jest pelen cudzyslowow, backslashy i znakow nowej linii, ktore slabsze
// darmowe modele notorycznie zle escapuja wewnatrz stringa JSON. Blok kodu tego
// problemu nie ma, bo niczego nie trzeba escapowac.
function parseScriptResponse(text: string): { script: string; explanation: string } {
  // 1. Zgodnosc wstecz - model mimo wszystko oddal poprawny JSON
  const jsonFence = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonCandidate = (jsonFence ? jsonFence[1] : text).trim();
  if (jsonCandidate.startsWith("{")) {
    const attempts = [jsonCandidate];
    try { attempts.push(jsonrepair(jsonCandidate)); } catch { /* nie da sie naprawic */ }
    for (const candidate of attempts) {
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed?.script === "string" && parsed.script.trim()) {
          return { script: parsed.script.trim(), explanation: String(parsed.explanation ?? "").trim() };
        }
      } catch { /* probujemy kolejnego wariantu */ }
    }
  }

  // 2. Wlasciwy kontrakt - blok kodu, a reszta tekstu to uwagi
  const codeFence = text.match(/```(?:powershell|pwsh|ps1?)?\s*([\s\S]*?)```/i);
  if (codeFence?.index !== undefined) {
    const rest = text.slice(0, codeFence.index) + text.slice(codeFence.index + codeFence[0].length);
    return { script: codeFence[1].trim(), explanation: cleanNotes(rest) };
  }

  // 3. Brak bloku - model oddal goly kod, ewentualnie z sekcja uwag
  const [code, ...notes] = text.split(/^---UWAGI---$/m);
  return { script: code.trim(), explanation: cleanNotes(notes.join("\n")) };
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
    if (prompt === "losowy skrypt PowerShell") {
      prompt = "losowy, użyteczny skrypt PowerShell, np. do zarządzania plikami, procesami, siecią lub systemem"; // Use a more open-ended prompt for AI
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
      "Jesteś ekspertem od skryptów PowerShell. Odpowiadaj WYŁĄCZNIE czystym tekstem w tym formacie: najpierw pojedynczy blok kodu ```powershell zawierający gotowy skrypt, a następnie — tylko jeśli masz ostrzeżenia lub objaśnienia — linia ---UWAGI--- i pod nią zwięzły opis. Nie zwracaj JSON-a. Nie pisz nic przed blokiem kodu. Skrypt ma być bezpieczny i zgodny z dobrymi praktykami. Jeśli zapytanie jest niejasne lub potencjalnie niebezpieczne, nie generuj skryptu — umieść wyjaśnienie w sekcji ---UWAGI---.";
    const userPrompt = `Wygeneruj skrypt PowerShell dla: ${prompt}`;

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

    const { script, explanation } = parseScriptResponse(aiResponseContent);
    if (!script) {
      console.error("Odpowiedz bez kodu skryptu:", aiResponseContent);
      throw new Error("Model AI nie zwrocil kodu skryptu. Sprobuj ponownie lub doprecyzuj opis.");
    }

    return new Response(JSON.stringify({ script, explanation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating PowerShell script:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});