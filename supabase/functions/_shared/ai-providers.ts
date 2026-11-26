// Dwaj niezalezni dostawcy AI, zeby cos zwrocil nawet gdy jeden pada.
//
// openrouter/free losuje za kazdym razem inny darmowy model spod spodu.
// Znany, udokumentowany w wielu projektach problem: czasem trafi sie model
// "rozumujacy", ktory zuzyje caly max_tokens na ukryte tokeny rozumowania
// i zwroci 200 z pustym content. Parametr reasoning.exclude NIE pomaga -
// tylko chowa slad rozumowania z odpowiedzi, token-budzet i tak jest zuzyty
// (potwierdzone w dokumentacji OpenRoutera), a router nie ujawnia dla
// openrouter/free, czy wylosowany model w ogole obsluguje ten parametr.
//
// Gemini (generativelanguage.googleapis.com) to zupelnie inna infrastruktura
// niz OpenRouter - gdy OpenRouter akurat szwankuje, Gemini zwykle nie ma
// tego samego problemu w tym samym momencie (i odwrotnie - model Gemini
// "lite" tez bywa chwilowo przeciazony, 503 "high demand"). Wolany TYLKO
// jako siatka bezpieczenstwa, gdy OpenRouterowi sie nie uda - GEMINI_API_KEY
// jest opcjonalny, bez niego kazdy generator dziala dokladnie tak jak
// wczesniej, samym OpenRouterem.
const AI_TIMEOUT_MS = 30_000;

async function callOpenRouterOnce(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: "openrouter/free",
      provider: { sort: "throughput" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API returned an error: ${response.status} ${JSON.stringify(errorData).slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pusta odpowiedz OpenRouter.");
  return content;
}

async function callGeminiOnce(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API returned an error: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Pusta odpowiedz Gemini.");
  return content;
}

export interface AiProviderKeys {
  openrouterApiKey: string;
  geminiApiKey?: string;
}

const GENERIC_FAILURE_MESSAGE =
  "Model AI nie zwrócił treści — darmowy router był chwilowo przeciążony. Spróbuj ponownie za chwilę.";

/**
 * Proba OpenRouter (do 2 razy), a jesli to nie wystarczy i jest ustawiony
 * GEMINI_API_KEY - Gemini (do 2 razy). Zwraca tekst pierwszej udanej proby,
 * albo rzuca blad z komunikatem zrozumialym dla uzytkownika, gdy wszystkie
 * proby zawiedly.
 *
 * Uzywana zarowno w trybie bez streamingu, jak i jako fallback w trybie
 * streamingowym (patrz openRouterTextStreamWithFallback w stream.ts).
 */
export async function fetchAiText(
  systemPrompt: string,
  userPrompt: string,
  keys: AiProviderKeys,
  maxTokens = 4096,
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await callOpenRouterOnce(keys.openrouterApiKey, systemPrompt, userPrompt, maxTokens);
    } catch (error) {
      console.error(`OpenRouter proba ${attempt}/2 - wyjatek:`, error);
      lastError = error;
    }
  }

  if (keys.geminiApiKey) {
    const geminiApiKey = keys.geminiApiKey;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await callGeminiOnce(geminiApiKey, systemPrompt, userPrompt, maxTokens);
      } catch (error) {
        console.error(`Gemini proba ${attempt}/2 - wyjatek:`, error);
        lastError = error;
      }
    }
  }

  console.error("Wszystkie proby AI wyczerpane, ostatni blad:", lastError);
  throw new Error(GENERIC_FAILURE_MESSAGE);
}
