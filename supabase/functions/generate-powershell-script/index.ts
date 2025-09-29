import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Jesteś ekspertem od skryptów PowerShell. Twoim zadaniem jest generowanie skryptów PowerShell na podstawie opisów użytkownika. Zawsze zwracaj tylko czysty kod PowerShell, bez dodatkowych objaśnień, wstępów czy zakończeń. Jeśli potrzebujesz dodać ważne informacje lub ostrzeżenia, umieść je w osobnym bloku tekstowym, który będzie oddzielony od kodu. Format odpowiedzi powinien być obiektem JSON z dwoma polami: `script` (zawierającym czysty kod PowerShell) i `explanation` (zawierającym wszelkie objaśnienia lub ostrzeżenia). Jeśli nie ma objaśnień, pole `explanation` powinno być pustym ciągiem. Zawsze dodawaj komentarz na początku skryptu, że został wygenerowany przez AI i wymaga weryfikacji. Upewnij się, że skrypt jest bezpieczny i zgodny z najlepszymi praktykami. Jeśli zapytanie jest niejasne lub potencjalnie niebezpieczne, poproś o więcej szczegółów lub odmów generowania skryptu, wyjaśniając dlaczego." }],
        },
        {
          role: "model",
          parts: [{ text: JSON.stringify({ script: "# Skrypt PowerShell wygenerowany przez AI. Zawsze weryfikuj przed użyciem.\n# Przykład: Pobierz listę procesów\nGet-Process", explanation: "" }) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(`Wygeneruj skrypt PowerShell dla: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", text, e);
      // If parsing fails, assume the entire text is the script and provide a generic explanation
      parsedResponse = {
        script: text,
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