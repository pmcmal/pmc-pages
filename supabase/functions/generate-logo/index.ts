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
    console.log("Received prompt:", prompt);

    if (!prompt) {
      console.error("Error: Prompt is required.");
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterApiKey) {
      console.error("Error: OPENROUTER_API_KEY is not set.");
      throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
    }
    console.log("OPENROUTER_API_KEY is set.");

    const requestBody = JSON.stringify({
      model: "stability-ai/stable-diffusion-xl",
      prompt: `Stwórz minimalistyczne logo na podstawie opisu: "${prompt}". Skup się na prostocie, czytelności i unikalności. Zwróć obraz w formacie PNG.`,
      n: 1,
      size: "512x512",
      response_format: "url",
    });
    console.log("Sending request to OpenRouter:", requestBody);

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    console.log("Received response status from OpenRouter:", openrouterResponse.status);

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json();
      console.error("OpenRouter API error response:", errorData);
      throw new Error(`OpenRouter API returned an error: ${openrouterResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openrouterResponse.json();
    console.log("Parsed data from OpenRouter:", data);
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error("Error: Image URL not found in OpenRouter response.", data);
      throw new Error("Nie udało się uzyskać URL obrazu z odpowiedzi AI.");
    }
    console.log("Generated image URL:", imageUrl);

    return new Response(JSON.stringify({
      imageUrl: imageUrl,
      disclaimer: "To jest wygenerowany obraz AI. Może wymagać dalszej edycji lub dostosowania do Twoich potrzeb. Pamiętaj, że jakość i styl mogą się różnić."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating logo image in Edge Function:", error.message);
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});