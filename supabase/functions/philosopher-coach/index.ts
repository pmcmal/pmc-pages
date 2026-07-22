import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@3";

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
    let { problem } = await req.json();

    // Handle "Surprise me" logic: if problem is generic, use a more open-ended prompt
    if (problem === "losowy problem życiowy") {
      problem = "dowolny problem życiowy"; // Use a more open-ended prompt for AI
    } else if (!problem) {
      return new Response(JSON.stringify({ error: "Problem description is required" }), {
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
            content: `Jesteś profesjonalnym filozofem i coachem życiowym. Twoim zadaniem jest udzielanie głębokich, przemyślanych i inspirujących porad życiowych na podstawie problemów przedstawionych przez użytkownika. Skup się na perspektywie filozoficznej, zachęcaj do refleksji i oferuj konstruktywne podejście. Zawsze zwracaj odpowiedź w formacie JSON z dwoma polami: 'advice' (zawierającym Twoją poradę) i 'disclaimer' (zawierającym krótkie ostrzeżenie, że to jest porada AI i nie zastępuje profesjonalnej pomocy).`,
          },
          {
            role: "user",
            content: `Mój problem: ${problem}`,
          },
        ],
        max_tokens: 1024,
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

    let parsedResponse;
    const jsonCandidate = extractJson(aiResponseContent);
    try {
      parsedResponse = JSON.parse(jsonCandidate);
    } catch {
      try {
        parsedResponse = JSON.parse(jsonrepair(jsonCandidate));
      } catch (e) {
        console.error("Failed to parse AI response as JSON:", aiResponseContent, e);
        parsedResponse = {
          advice: "Przepraszam, nie udało mi się sformułować porady w oczekiwanym formacie. Proszę spróbować ponownie.",
          disclaimer: "To jest porada wygenerowana przez AI i nie zastępuje profesjonalnej pomocy.",
        };
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating philosophical advice:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});