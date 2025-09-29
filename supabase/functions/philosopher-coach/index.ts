import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        model: "openai/gpt-3.5-turbo", // Możesz wybrać inny model dostępny na OpenRouter
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
    try {
      parsedResponse = JSON.parse(aiResponseContent);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", aiResponseContent, e);
      parsedResponse = {
        advice: "Przepraszam, nie udało mi się sformułować porady w oczekiwanym formacie. Proszę spróbować ponownie.",
        disclaimer: "To jest porada wygenerowana przez AI i nie zastępuje profesjonalnej pomocy.",
      };
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