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

    // Handle "Surprise me" logic: if prompt is generic, use a more open-ended prompt
    if (prompt === "losowe składniki") {
      prompt = "zaskocz mnie ciekawym przepisem na danie z losowych składników"; // Make the prompt more explicit for AI
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
        model: "openai/gpt-3.5-turbo", // You can choose a different model available on OpenRouter
        messages: [
          {
            role: "system",
            content: `Jesteś ekspertem kulinarnym i generujesz przepisy na szybkie i proste dania. Jeśli użytkownik poda konkretne składniki, wykorzystaj je. Jeśli użytkownik poprosi o "zaskoczenie" lub poda ogólne zapytanie, wygeneruj ciekawy przepis z losowych składników. Zawsze zwracaj przepis w formacie JSON z polami: \`recipeText\` (zawierającym pełny przepis z listą składników i instrukcjami) oraz \`conversionTable\` (zawierającym prostą tabelę przeliczników wagi na popularne miary, np. łyżeczki, szklanki, dla kilku podstawowych składników jak mąka, cukier, woda, olej. Podaj wartości w gramach i odpowiadające im miary domowe. Upewnij się, że przepis jest łatwy do wykonania.`,
          },
          {
            role: "user",
            content: `Wygeneruj przepis na podstawie dostępnych składników: ${prompt}`,
          },
        ],
        max_tokens: 2048,
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
      // Jeśli parsowanie się nie powiedzie, ustaw conversionTable na pusty ciąg
      parsedResponse = {
        recipeText: aiResponseContent,
        conversionTable: "", // Ustawiamy na pusty ciąg
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating recipe:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});