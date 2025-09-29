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

    // Using OpenRouter API endpoint, compatible with OpenAI API
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
            content: "Jesteś ekspertem od skryptów PowerShell. Twoim zadaniem jest generowanie skryptów PowerShell na podstawie opisów użytkownika. Zawsze zwracaj tylko czysty kod PowerShell, bez dodatkowych objaśnień, wstępów czy zakończeń. Jeśli potrzebujesz dodać ważne informacje lub ostrzeżenia, umieść je w osobnym bloku tekstowym, który będzie oddzielony od kodu. Format odpowiedzi powinien być obiektem JSON z dwoma polami: `script` (zawierającym czysty kod PowerShell) i `explanation` (zawierającym wszelkie objaśnienia lub ostrzeżenia). Jeśli nie ma objaśnień, pole `explanation` powinno być pustym ciągiem. Zawsze dodawaj komentarz na początku skryptu, że został wygenerowany przez AI i wymaga weryfikacji. Upewnij się, że skrypt jest bezpieczny i zgodny z najlepszymi praktykami. Jeśli zapytanie jest niejasne lub potencjalnie niebezpieczne, poproś o więcej szczegółów lub odmów generowania skryptu, wyjaśniając dlaczego.",
          },
          {
            role: "user",
            content: `Wygeneruj skrypt PowerShell dla: ${prompt}`,
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

    // Attempt to parse the response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponseContent);
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