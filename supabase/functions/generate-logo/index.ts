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

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "stability-ai/stable-diffusion-xl", // Model generujący obrazy
        prompt: `Stwórz minimalistyczne logo na podstawie opisu: "${prompt}". Skup się na prostocie, czytelności i unikalności. Zwróć obraz w formacie PNG.`,
        n: 1, // Liczba generowanych obrazów
        size: "512x512", // Rozmiar obrazu
        response_format: "url", // Oczekujemy URL obrazu
      }),
    });

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openrouterResponse.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Nie udało się uzyskać URL obrazu z odpowiedzi AI.");
    }

    return new Response(JSON.stringify({
      imageUrl: imageUrl,
      disclaimer: "To jest wygenerowany obraz AI. Może wymagać dalszej edycji lub dostosowania do Twoich potrzeb. Pamiętaj, że jakość i styl mogą się różnić."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating logo image:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});