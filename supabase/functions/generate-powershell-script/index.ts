import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";

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
    let { prompt } = await req.json();

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

    // Using OpenRouter API endpoint, compatible with OpenAI API
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
            content: "Jesteś ekspertem od skryptów PowerShell. Odpowiadaj WYŁĄCZNIE czystym tekstem w tym formacie: najpierw pojedynczy blok kodu ```powershell zawierający gotowy skrypt, a następnie — tylko jeśli masz ostrzeżenia lub objaśnienia — linia ---UWAGI--- i pod nią zwięzły opis. Nie zwracaj JSON-a. Nie pisz nic przed blokiem kodu. Skrypt ma być bezpieczny i zgodny z dobrymi praktykami. Jeśli zapytanie jest niejasne lub potencjalnie niebezpieczne, nie generuj skryptu — umieść wyjaśnienie w sekcji ---UWAGI---.",
          },
          {
            role: "user",
            content: `Wygeneruj skrypt PowerShell dla: ${prompt}`,
          },
        ],
        max_tokens: 2048,
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