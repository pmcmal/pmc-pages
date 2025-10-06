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
    let { genre, character, event } = await req.json();

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
            content: `Jesteś utalentowanym pisarzem. Twoim zadaniem jest generowanie spójnych, wciągających i **szczegółowych opowiadań, podzielonych na logiczne akapity**, na podstawie podanych przez użytkownika informacji. Opowiadanie powinno być tak długie, jak to możliwe w ramach jednej odpowiedzi API (około 1000-3000 słów). Zawsze zwracaj odpowiedź w formacie JSON z dwoma polami: 'story' (zawierającym wygenerowane opowiadanie) i 'disclaimer' (zawierającym krótkie ostrzeżenie, że to jest opowiadanie AI i jego długość jest ograniczona do jednej odpowiedzi API).`,
          },
          {
            role: "user",
            content: `Wygeneruj opowiadanie. Gatunek: ${genre}, Postać: ${character}, Zdarzenie: ${event}.`,
          },
        ],
        max_tokens: 4096, // Ustawienie na 4096 tokenów dla dłuższych odpowiedzi
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
        story: aiResponseContent,
        disclaimer: "Przepraszam, nie udało mi się sformułować opowiadania w oczekiwanym formacie. Proszę dokładnie sprawdzić wygenerowany tekst. Opowiadanie może być skrócone, ponieważ jego długość jest ograniczona do jednej odpowiedzi API.",
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating story:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});