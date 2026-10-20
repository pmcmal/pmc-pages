// Klient strumieniowych edge functions.
//
// supabase.functions.invoke() buforuje cala odpowiedz, wiec nie nadaje sie do
// strumieniowania - tutaj idziemy po prostu fetchem pod ten sam adres, z tymi
// samymi naglowkami, ktore dokleja klient Supabase.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class EdgeFunctionError extends Error {}

/**
 * Wola edge function w trybie strumieniowym i doklada kolejne kawalki tekstu.
 *
 * `onText` dostaje za kazdym razem CALY tekst zebrany do tej pory, a nie sam
 * przyrost - dzieki temu strona moze po prostu wrzucic go do stanu, bez
 * sklejania po swojej stronie.
 *
 * Zwraca komplet tekstu po zamknieciu strumienia.
 */
export async function streamEdgeFunction(
  name: string,
  body: Record<string, unknown>,
  onText: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  if (!response.ok) {
    // Blad funkcja zwraca jako JSON, nie jako strumien.
    let message = `Funkcja zwrocila status ${response.status}.`;
    try {
      const data = await response.json();
      if (typeof data?.error === "string" && data.error) message = data.error;
    } catch {
      // odpowiedz nie byla JSON-em - zostaje komunikat ze statusem
    }
    throw new EdgeFunctionError(message);
  }

  if (!response.body) {
    throw new EdgeFunctionError("Przegladarka nie udostepnila strumienia odpowiedzi.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onText(full);
    }
  } finally {
    reader.releaseLock();
  }

  full += decoder.decode();
  onText(full);

  if (!full.trim()) {
    throw new EdgeFunctionError(
      "Model AI nie zwrócił treści — darmowy router był chwilowo przeciążony. Spróbuj ponownie za chwilę.",
    );
  }

  return full;
}
