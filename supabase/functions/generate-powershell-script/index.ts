import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Niektore darmowe modele owijaja odpowiedz w blok markdown ```json ... ``` mimo instrukcji w promptcie
function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text;
}

serve(async (req) => {
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
            content: "Jesteś ekspertem od skryptów PowerShell. Twoim zadaniem jest generowanie skryptów PowerShell na podstawie opisów użytkownika. Zawsze zwracaj tylko czysty kod PowerShell, bez dodatkowych objaśnień, wstępów czy zakończeń. Jeśli potrzebujesz dodać ważne informacje lub ostrzeżenia, umieść je w osobnym bloku tekstowym, który będzie oddzielony od kodu. Format odpowiedzi powinien być obiektem JSON z dwoma polami: `script` (zawierającym czysty kod PowerShell) i `explanation` (zawierającym wszelkie objaśnienia lub ostrzeżenia). Jeśli nie ma objaśnień, pole `explanation` powinno być pustym ciągiem. Upewnij się, że skrypt jest bezpieczny i zgodny z najlepszymi praktykami. Jeśli zapytanie jest niejasne lub potencjalnie niebezpieczne, poproś o więcej szczegółów lub odmów generowania skryptu, wyjaśniając dlaczego.",
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
    const aiResponseContent = data.choices[0].message.content;

    // Attempt to parse the response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(extractJson(aiResponseContent));
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", aiResponseContent, e);
      // If parsing fails, assume the entire text is the script and provide a generic explanation
      parsedResponse = {
        script: aiResponseContent,
        explanation: "Nie udało się poprawnie przetworzyć odpowiedzi AI. Proszę dokładnie sprawdzić wygenerowany skrypt.",
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating PowerShell script:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});