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
    let { prompt } = await req.json();

    if (prompt === "losowy pomysł na projekt elektroniczny na Raspberry Pi, Arduino lub prosty układ do lutowania") {
      prompt = "losowy, ciekawy i prosty do wykonania pomysł na projekt elektroniczny na Raspberry Pi, Arduino lub inny prosty układ do lutowania, np. dla początkujących";
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
            content: `Jesteś ekspertem od elektroniki i generujesz pomysły na projekty elektroniczne. Twoim zadaniem jest tworzenie kreatywnych, ale realistycznych i możliwych do wykonania pomysłów na projekty z wykorzystaniem Raspberry Pi, Arduino lub prostych układów do lutowania. Pomysł powinien zawierać:
            1. Krótki opis projektu.
            2. Listę głównych komponentów potrzebnych do jego zbudowania (np. Arduino Uno, czujnik temperatury DHT11, dioda LED, rezystor 220 Ohm).
            3. Ogólny zarys działania.
            4. Jeśli projekt wymaga programowania (np. Arduino, Raspberry Pi), dołącz przykładowy, krótki kod (np. szkic Arduino, prosty skrypt Python), umieszczony w bloku kodu. Jeśli kod nie jest potrzebny, pole 'exampleCode' powinno być puste.
            
            Zawsze zwracaj odpowiedź w formacie JSON z następującymi polami:
            - 'projectIdea' (string): Krótki opis projektu i zarys działania.
            - 'componentsNeeded' (array of strings): Lista potrzebnych komponentów.
            - 'exampleCode' (string): Przykładowy kod, jeśli dotyczy. Jeśli nie, pusty string.
            - 'disclaimer' (string): Krótkie ostrzeżenie, że to jest pomysł AI i wymaga dalszego planowania oraz weryfikacji.`,
          },
          {
            role: "user",
            content: `Wygeneruj pomysł na projekt elektroniczny dla: ${prompt}`,
          },
        ],
        max_tokens: 1500, // Zwiększono limit tokenów, aby pomieścić kod i komponenty
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
        projectIdea: aiResponseContent,
        componentsNeeded: [],
        exampleCode: "",
        disclaimer: "Przepraszam, nie udało mi się sformułować pomysłu na projekt w oczekiwanym formacie. Proszę dokładnie sprawdzić wygenerowany tekst. Pamiętaj, że to jest tylko pomysł i wymaga dalszego planowania.",
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating electronic project idea:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});