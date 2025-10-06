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
    const { prompt } = await req.json();

    if (!prompt) {
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
            content: `Jesteś ekspertem od projektowania logo. Twoim zadaniem jest generowanie tekstowych koncepcji logo (np. ASCII art, opis stylu, czcionki, układu) na podstawie opisu użytkownika. Zawsze zwracaj odpowiedź w formacie JSON z dwoma polami: \`logoText\` (zawierającym tekstową reprezentację lub szczegółowy opis koncepcji logo) i \`disclaimer\` (zawierającym krótkie ostrzeżenie, że to jest tekstowa koncepcja AI i nie jest gotowym plikiem graficznym). Jeśli zapytanie jest niejasne lub potencjalnie nieodpowiednie, poproś o więcej szczegółów lub odmów generowania, wyjaśniając dlaczego.`,
          },
          {
            role: "user",
            content: `Wygeneruj koncepcję logo dla: ${prompt}`,
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
      parsedResponse = {
        logoText: aiResponseContent,
        disclaimer: "Nie udało się poprawnie przetworzyć odpowiedzi AI. Proszę dokładnie sprawdzić wygenerowaną koncepcję logo.",
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating logo:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});